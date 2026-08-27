import '../firestore_refs.dart';
import '../models/song.dart';

/// Songs, videos and playlists. All three collections are world-readable under
/// `firestore.rules`, so none of this needs an account.
class SongsRepository {
  SongsRepository(this._refs);

  final Refs _refs;

  Stream<List<Playlist>> watchPlaylists() {
    return _refs.playlists
        .orderBy('order')
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(Playlist.fromDoc)
              .where((playlist) => playlist.active)
              .toList(growable: false),
        );
  }

  /// Everything, newest first — the same default the admin panel lists with.
  Stream<List<Song>> watchSongs({int max = 200}) {
    return _refs.songs
        .orderBy('createdAt', descending: true)
        .limit(max)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(Song.fromDoc).toList());
  }

  /// One playlist, in the order the playlist manager arranged it.
  Stream<List<Song>> watchPlaylistSongs(String playlistId) {
    return _refs.songs
        .where('playlistIds', arrayContains: playlistId)
        .orderBy('order')
        .snapshots()
        .map((snapshot) => snapshot.docs.map(Song.fromDoc).toList());
  }

  /// New releases.
  ///
  /// The admin query is an unordered equality filter, so the sort happens here
  /// rather than costing an index for a list that is only ever a handful long.
  Future<List<Song>> newReleases() async {
    final snapshot = await _refs.songs
        .where('isNewRelease', isEqualTo: true)
        .get();
    final songs = snapshot.docs.map(Song.fromDoc).toList()
      ..sort((a, b) => a.order.compareTo(b.order));
    return songs;
  }
}
