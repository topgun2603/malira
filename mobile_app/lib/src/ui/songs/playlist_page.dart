import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/states.dart';
import 'songs_page.dart';

/// One playlist, in the order the playlist manager arranged it.
class PlaylistPage extends ConsumerWidget {
  const PlaylistPage({super.key, required this.playlistId, this.title = ''});

  final String playlistId;

  /// Passed in the URL so the title bar is right on the first frame rather than
  /// waiting on a lookup for a string the previous screen already had.
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final songs = ref.watch(playlistSongsProvider(playlistId));

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title.isEmpty ? strings.playlists : title,
          style: context.texts.titleLarge,
        ),
        shape: Border(bottom: BorderSide(color: context.brand.border)),
      ),
      body: switch (songs) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(playlistSongsProvider(playlistId)),
        ),
        AsyncData(:final value) when value.isEmpty => EmptyState(
          icon: Icons.queue_music_outlined,
          title: strings.noSongs,
          body: strings.noSongsBody,
        ),
        AsyncData(:final value) => ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: Gap.md),
          itemCount: value.length,
          itemBuilder: (context, index) =>
              SongRow(song: value[index], strings: strings),
        ),
      },
    );
  }
}
