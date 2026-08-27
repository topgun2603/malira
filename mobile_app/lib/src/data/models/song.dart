import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/youtube.dart';
import 'parsing.dart';

/// A song or video. The admin panel stores only the YouTube id and derives
/// everything else from it, so the app does the same rather than keeping its
/// own copy of a URL that could drift.
class Song {
  const Song({
    required this.id,
    required this.title,
    required this.titleTa,
    required this.youtubeId,
    required this.thumbnailUrl,
    required this.artistName,
    required this.playlistIds,
    required this.isNewRelease,
    required this.order,
  });

  factory Song.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    final youtubeId = data.str('youtubeId');
    return Song(
      id: doc.id,
      title: data.str('title'),
      titleTa: data.str('titleTa'),
      youtubeId: youtubeId,
      // Fall back to the canonical thumbnail path rather than showing a grey
      // box: the id is all YouTube needs to serve one.
      thumbnailUrl:
          data.strOrNull('thumbnailUrl') ?? YouTube.thumbnail(youtubeId),
      artistName: data.str('artistName'),
      playlistIds: data.strings('playlistIds'),
      isNewRelease: data.flag('isNewRelease'),
      order: data.integer('order'),
    );
  }

  final String id;
  final String title;
  final String titleTa;
  final String youtubeId;
  final String thumbnailUrl;
  final String artistName;
  final List<String> playlistIds;
  final bool isNewRelease;
  final int order;

  Uri get watchUri => YouTube.watchUri(youtubeId);
}

/// A curated song list.
class Playlist {
  const Playlist({
    required this.id,
    required this.name,
    required this.nameTa,
    required this.description,
    required this.coverUrl,
    required this.order,
    required this.active,
  });

  factory Playlist.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Playlist(
      id: doc.id,
      name: data.str('name'),
      nameTa: data.str('nameTa'),
      description: data.str('description'),
      coverUrl: data.strOrNull('coverUrl'),
      order: data.integer('order'),
      active: data.flag('active', true),
    );
  }

  final String id;
  final String name;
  final String nameTa;
  final String description;
  final String? coverUrl;
  final int order;
  final bool active;
}
