import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/song.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/app_image.dart';
import '../common/generated_cover.dart';
import '../common/states.dart';
import '../shell/root_shell.dart';

/// Songs and videos.
///
/// Reorganised around the way a library is actually used: one thing to play
/// right now, then a way in by mood, then everything. So the newest release
/// takes the top of the screen at full width, playlists follow as covers, and
/// the full library is a numbered tracklist underneath.
///
/// Playback stays with YouTube. The desk stores only a video id, the rights
/// live there, and an in-app player would mean owning buffering, advertising
/// and offline questions that nothing here needs. Every tile therefore says
/// where it is about to send you rather than pretending to play in place.
class SongsPage extends ConsumerWidget {
  const SongsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final songs = ref.watch(songsProvider);
    final playlists = ref.watch(playlistsProvider).value ?? const [];
    final newReleases = ref.watch(newReleasesProvider).value ?? const [];

    return Scaffold(
      appBar: AppBar(
        leading: const AppMenuButton(),
        title: Text(strings.songs, style: context.texts.titleLarge),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: Gap.md),
            child: LanguageToggle(),
          ),
        ],
        shape: Border(bottom: BorderSide(color: context.brand.border)),
      ),
      body: switch (songs) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(songsProvider),
        ),
        AsyncData(:final value) when value.isEmpty && playlists.isEmpty =>
          EmptyState(
            icon: Icons.music_note_outlined,
            title: strings.noSongs,
            body: strings.noSongsBody,
          ),
        AsyncData(:final value) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(songsProvider);
            ref.invalidate(newReleasesProvider);
          },
          child: ListView(
            padding: const EdgeInsets.only(bottom: Gap.xxl),
            children: [
              // The lead: the newest release if the desk has flagged one,
              // otherwise simply the most recent thing added. There is always
              // something to play.
              if (newReleases.isNotEmpty || value.isNotEmpty)
                _Feature(
                  song: newReleases.isNotEmpty
                      ? newReleases.first
                      : value.first,
                  strings: strings,
                  isFlagged: newReleases.isNotEmpty,
                ),

              if (playlists.isNotEmpty) ...[
                _SectionTitle(label: strings.playlists),
                SizedBox(
                  height: 176,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: Gap.page),
                    itemCount: playlists.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: Gap.md),
                    itemBuilder: (context, index) => _PlaylistCard(
                      playlist: playlists[index],
                      strings: strings,
                    ),
                  ),
                ),
              ],

              if (newReleases.length > 1) ...[
                _SectionTitle(label: strings.newReleases),
                SizedBox(
                  height: 168,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: Gap.page),
                    itemCount: newReleases.length - 1,
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: Gap.md),
                    itemBuilder: (context, index) => _ReleaseCard(
                      song: newReleases[index + 1],
                      strings: strings,
                    ),
                  ),
                ),
              ],

              if (value.isNotEmpty) ...[
                _SectionTitle(
                  label: strings.browseAll,
                  trailing: strings.songCount(value.length),
                ),
                for (var index = 0; index < value.length; index++)
                  SongRow(
                    song: value[index],
                    strings: strings,
                    position: index + 1,
                  ),
              ],
            ],
          ),
        ),
      },
    );
  }
}

Future<void> _play(Song song) async {
  await launchUrl(song.watchUri, mode: LaunchMode.externalApplication);
}

/// The lead track, full width.
class _Feature extends StatelessWidget {
  const _Feature({
    required this.song,
    required this.strings,
    required this.isFlagged,
  });

  final Song song;
  final Strings strings;

  /// True when the desk marked this a new release, rather than it merely being
  /// the most recent thing in the library.
  final bool isFlagged;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.lg, Gap.page, 0),
      child: GestureDetector(
        onTap: () => _play(song),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Radii.xl),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppImage(url: song.thumbnailUrl, fit: BoxFit.cover),
                // The photograph scrim, not the cover one: a YouTube thumbnail
                // usually has its own title burnt into it, and the lighter
                // gradient left this one competing with it.
                const ImageScrim(strength: 0.9),

                Padding(
                  padding: const EdgeInsets.all(Gap.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isFlagged
                                ? brand.saffron
                                : Colors.white.withValues(alpha: 0.22),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            (isFlagged
                                    ? strings.newReleases
                                    : strings.latestRelease)
                                .toUpperCase(),
                            style: context.texts.labelSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        strings.pick(song.title, song.titleTa),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.texts.headlineSmall?.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      if (song.artistName.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          song.artistName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.texts.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                      const SizedBox(height: Gap.md),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            // YouTube red, deliberately: this is the one place
                            // the app hands the reader to somebody else, and
                            // borrowing their colour is the clearest way to say
                            // so before the tap.
                            color: const Color(0xE6FF0000),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.play_arrow_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                strings.playOnYouTube,
                                style: context.texts.labelMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.label, this.trailing});

  final String label;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.md),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 16,
            decoration: BoxDecoration(
              color: context.brand.saffron,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: Gap.sm),
          Expanded(child: Text(label, style: context.texts.titleMedium)),
          if (trailing != null) Text(trailing!, style: context.texts.bodySmall),
        ],
      ),
    );
  }
}

/// A playlist, as a cover.
///
/// Generated artwork when there is none stored, tinted from the playlist id so
/// the same list is the same colour every visit. Most playlists here have no
/// cover, and a row of grey squares is worse than no row at all.
class _PlaylistCard extends ConsumerWidget {
  const _PlaylistCard({required this.playlist, required this.strings});

  final Playlist playlist;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = strings.pick(playlist.name, playlist.nameTa);
    final songs = ref.watch(playlistSongsProvider(playlist.id)).value;

    return SizedBox(
      width: 132,
      child: GestureDetector(
        onTap: () => context.push(
          '/playlist/${playlist.id}?title=${Uri.encodeComponent(name)}',
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GeneratedCover(
              seed: playlist.id,
              label: name,
              imageUrl: playlist.coverUrl,
              height: 132,
              width: 132,
              icon: Icons.queue_music,
            ),
            const SizedBox(height: Gap.sm),
            Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.texts.titleSmall,
            ),
            if (songs != null)
              Text(
                strings.songCount(songs.length),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.texts.bodySmall,
              ),
          ],
        ),
      ),
    );
  }
}

/// A new release in the horizontal rail.
class _ReleaseCard extends StatelessWidget {
  const _ReleaseCard({required this.song, required this.strings});

  final Song song;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 196,
      child: GestureDetector(
        onTap: () => _play(song),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AppImage(
                  url: song.thumbnailUrl,
                  height: 110,
                  width: 196,
                  borderRadius: BorderRadius.circular(Radii.lg),
                ),
                const Positioned.fill(child: Center(child: _PlayBadge())),
              ],
            ),
            const SizedBox(height: Gap.sm),
            Text(
              strings.pick(song.title, song.titleTa),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.texts.titleSmall,
            ),
            if (song.artistName.isNotEmpty)
              Text(
                song.artistName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.texts.bodySmall,
              ),
          ],
        ),
      ),
    );
  }
}

/// A tracklist row.
///
/// Numbered, because the full library reads as a chart and a number gives the
/// eye something to travel down. Also used by the playlist screen, where the
/// number is the running order the playlist manager arranged.
class SongRow extends StatelessWidget {
  const SongRow({
    super.key,
    required this.song,
    required this.strings,
    this.position,
  });

  final Song song;
  final Strings strings;
  final int? position;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      onTap: () => _play(song),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.page,
          vertical: Gap.sm,
        ),
        child: Row(
          children: [
            if (position != null) ...[
              SizedBox(
                width: 26,
                child: Text(
                  '$position',
                  textAlign: TextAlign.center,
                  style: context.texts.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: Gap.sm),
            ],
            Stack(
              children: [
                AppImage(
                  url: song.thumbnailUrl,
                  height: 54,
                  width: 88,
                  borderRadius: BorderRadius.circular(Radii.md),
                ),
                const Positioned.fill(
                  child: Center(child: _PlayBadge(compact: true)),
                ),
              ],
            ),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.pick(song.title, song.titleTa),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: context.texts.titleSmall,
                  ),
                  if (song.artistName.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      song.artistName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
            // Says plainly that the tap leaves the app.
            Icon(Icons.open_in_new, size: 16, color: brand.mutedForeground),
          ],
        ),
      ),
    );
  }
}

class _PlayBadge extends StatelessWidget {
  const _PlayBadge({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final size = compact ? 26.0 : 40.0;
    return Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.55),
        shape: BoxShape.circle,
      ),
      child: Icon(
        Icons.play_arrow_rounded,
        color: Colors.white,
        size: compact ? 17 : 25,
      ),
    );
  }
}
