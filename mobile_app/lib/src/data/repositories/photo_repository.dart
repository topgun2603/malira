import 'dart:io';
import 'dart:math';
import 'dart:ui' show ImageDescriptor, ImmutableBuffer;

import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';

import '../models/article.dart';

/// Matrimony photographs.
///
/// A direct port of `uploadMatrimonyPhoto` in `web-admin/src/lib/api/storage.ts`
/// — same bucket path, same compression target, same returned shape — so a
/// photo added from a phone is indistinguishable from one added at the desk.
///
/// One honest caveat, carried over from the web verbatim because it is the
/// thing somebody would otherwise assume wrong: `getDownloadURL` returns a
/// tokenised URL that bypasses Storage rules for anyone holding it. The
/// protection that actually matters is not the Storage rule — it is that a
/// restricted photo's URL lives in the private Firestore subcollection and is
/// never sent to a client that has not earned it.
class PhotoRepository {
  PhotoRepository(this._storage);

  final FirebaseStorage _storage;

  /// The desk caps an article at five images; a listing gets the same ceiling.
  /// Past this it stops being a profile and starts being an album.
  static const int maxPhotos = 5;

  /// Compression target.
  ///
  /// Members photograph a printed horoscope or a portrait on a mid-range phone
  /// and hand over 6MB; this is read on 3G in the hills.
  ///
  /// Note the plugin's semantics differ from the web's: `minWidth`/`minHeight`
  /// are a floor on the *short* side, not a ceiling on the long one, so a 4:3
  /// photo lands near 2133x1600 rather than the browser path's 1600 long edge.
  /// Slightly more pixels for the same visual result, and the byte ceiling
  /// below is what actually bounds it.
  static const int _shortEdge = 1600;
  static const int _quality = 82;

  /// The Storage rule ceiling is 2MB. Anything still over it after compression
  /// is refused here rather than by a rule, so the member gets a sentence
  /// instead of a permission error.
  static const int _maxBytes = 2 * 1024 * 1024;

  /// Compresses and uploads one photograph, reporting 0..1 progress.
  ///
  /// [uid] must be the signed-in account: the Storage rule on
  /// `matrimony/{uid}/**` only lets somebody write into their own folder.
  Future<ArticleImage> upload({
    required File file,
    required String uid,
    ValueChanged<double>? onProgress,
  }) async {
    // JPEG on every platform, matching the web uploader.
    //
    // Android can encode and decode WebP perfectly well, so this is not a
    // capability problem — it is a consistency one. Both clients write into the
    // same bucket and both have to be read by the other, and one format across
    // the pair is one fewer thing to reason about when a photograph does not
    // appear.
    const format = CompressFormat.jpeg;
    const extension = 'jpg';
    const contentType = 'image/jpeg';

    final compressed = await FlutterImageCompress.compressWithFile(
      file.absolute.path,
      minWidth: _shortEdge,
      minHeight: _shortEdge,
      quality: _quality,
      format: format,
      // EXIF is dropped deliberately. A phone photograph carries GPS
      // coordinates, and a matrimony listing is the last place to publish the
      // house somebody was standing in when they took it.
      keepExif: false,
    );

    if (compressed == null) {
      throw const PhotoFailure('That file could not be read as a photograph.');
    }
    if (compressed.lengthInBytes > _maxBytes) {
      throw const PhotoFailure(
        'That photograph is too large even after compressing. Try another.',
      );
    }

    final size = await _dimensions(compressed);

    final name =
        '${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}'
        '-${_suffix()}.$extension';
    final path = 'matrimony/$uid/$name';
    final reference = _storage.ref(path);

    final task = reference.putData(
      compressed,
      SettableMetadata(
        contentType: contentType,
        // Private, and short-lived: unlike an article image, this is not
        // something to cache for a year on an edge node.
        cacheControl: 'private, max-age=3600',
      ),
    );

    if (onProgress != null) {
      task.snapshotEvents.listen((snapshot) {
        if (snapshot.totalBytes <= 0) return;
        onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
      });
    }

    try {
      await task;
    } on FirebaseException catch (error) {
      throw PhotoFailure(_message(error));
    }

    return ArticleImage(
      url: await reference.getDownloadURL(),
      path: path,
      width: size.$1,
      height: size.$2,
    );
  }

  /// Removes a photograph from Storage.
  ///
  /// Best-effort: an object that is already gone must not stop the member
  /// saving a profile that no longer refers to it.
  Future<void> delete(ArticleImage photo) async {
    if (photo.path.isEmpty) return;
    try {
      await _storage.ref(photo.path).delete();
    } catch (_) {
      // Already deleted, or never ours to begin with.
    }
  }

  /// Decodes just enough to learn the pixel dimensions.
  ///
  /// Stored so the feed can size a placeholder before the bytes arrive and the
  /// layout does not jump — the same reason `ArticleImage` carries them.
  static Future<(int, int)> _dimensions(Uint8List bytes) async {
    try {
      final descriptor = await ImageDescriptor.encoded(
        await ImmutableBuffer.fromUint8List(bytes),
      );
      final size = (descriptor.width, descriptor.height);
      descriptor.dispose();
      return size;
    } catch (_) {
      // A zero falls back to a 16:9 box, which is what ArticleImage does.
      return (0, 0);
    }
  }

  static String _suffix() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random();
    return List.generate(
      6,
      (_) => alphabet[random.nextInt(alphabet.length)],
    ).join();
  }

  static String _message(FirebaseException error) {
    return switch (error.code) {
      'unauthorized' =>
        'You can only add photographs to your own profile.',
      'canceled' => 'Upload cancelled.',
      'retry-limit-exceeded' || 'unknown' =>
        'The upload did not finish. Check your connection and try again.',
      _ => 'That photograph could not be uploaded.',
    };
  }
}

/// An upload problem, already worded for the member holding the phone.
class PhotoFailure implements Exception {
  const PhotoFailure(this.message);
  final String message;

  @override
  String toString() => message;
}
