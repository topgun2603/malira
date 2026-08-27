import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/matrimony.dart';
import '../../../state/matrimony.dart';
import '../../../state/preferences.dart';
import '../../common/app_image.dart';
import '../../common/generated_cover.dart';

/// One listing in the browse results.
///
/// A tall, full-bleed card: the photographs fill it, you swipe through them in
/// place, and the details sit over the image — the shape a shopping app uses,
/// because the job is the same one. Somebody is comparing a page of candidates
/// and deciding which to open, and that decision is made on the picture first
/// and four facts second.
///
/// The awkward case is the one this section is full of: most profiles restrict
/// their photographs, so there is nothing to show. Rather than a grey box, the
/// card falls back to the same generated gradient the rest of the app uses,
/// carries the initial, and says plainly that photographs exist but have not
/// been earned yet. A card with nothing behind the glass still has to look
/// deliberate.
class MatrimonyProfileCard extends ConsumerStatefulWidget {
  const MatrimonyProfileCard({super.key, required this.profile});

  final MatrimonyProfile profile;

  @override
  ConsumerState<MatrimonyProfileCard> createState() =>
      _MatrimonyProfileCardState();
}

class _MatrimonyProfileCardState extends ConsumerState<MatrimonyProfileCard> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final strings = ref.watch(stringsProvider);
    final state = ref.watch(interestStateProvider(profile.id));
    final brand = context.brand;

    final photos = profile.photos;
    final locked = profile.hasPhotos && photos.isEmpty;

    return GestureDetector(
      onTap: () => context.push('/matrimony/${profile.id}'),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.xl),
        child: AspectRatio(
          // Portrait, and taller than a photograph. The bottom third is text,
          // so the picture needs the room above it.
          aspectRatio: 3 / 4,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (photos.isEmpty)
                _Fallback(profile: profile, locked: locked)
              else
                PageView.builder(
                  controller: _controller,
                  itemCount: photos.length,
                  onPageChanged: (page) => setState(() => _page = page),
                  itemBuilder: (context, index) =>
                      AppImage(url: photos[index].url, fit: BoxFit.cover),
                ),

              // Heavier at the foot than the cover scrim: these are
              // photographs, and the name has to hold against a bright sari.
              const _CardScrim(),

              Padding(
                padding: const EdgeInsets.all(Gap.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (state != InterestState.none)
                          _StateChip(state: state, strings: strings),
                        const Spacer(),
                        if (photos.length > 1)
                          _Counter(page: _page + 1, total: photos.length),
                      ],
                    ),

                    const Spacer(),

                    // Name and age on one line, the way a listing is read
                    // aloud: "Bellie, twenty-six".
                    Text(
                      [
                        profile.name,
                        if (profile.age != null) '${profile.age}',
                      ].join(', '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.headlineSmall?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),

                    _Line(
                      text: [
                        profile.heightLabel,
                        strings.pick(
                          profile.maritalStatus.label,
                          profile.maritalStatus.labelTa,
                        ),
                        strings.pick(profile.diet.label, profile.diet.labelTa),
                      ].where((part) => part.isNotEmpty).join('  ·  '),
                    ),

                    if (profile.occupation.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      _Line(
                        icon: Icons.work_outline,
                        text: [
                          profile.occupation,
                          if (profile.workLocation.isNotEmpty)
                            profile.workLocation,
                        ].join(' · '),
                      ),
                    ],
                    if (profile.hometown.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      _Line(
                        icon: Icons.home_outlined,
                        text: profile.hometown,
                      ),
                    ],

                    if (locked) ...[
                      const SizedBox(height: Gap.md),
                      _LockedPill(label: strings.photosOnRequest),
                    ],

                    if (photos.length > 1) ...[
                      const SizedBox(height: Gap.md),
                      Row(
                        children: [
                          for (var index = 0; index < photos.length; index++)
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 220),
                              margin: const EdgeInsets.only(right: 4),
                              height: 3,
                              width: index == _page ? 22 : 10,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(
                                  alpha: index == _page ? 0.95 : 0.4,
                                ),
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Drawn last so the tinted overlay never sits over the tap area
              // of the page view underneath it.
              if (state == InterestState.matched)
                Positioned(
                  right: Gap.lg,
                  bottom: Gap.lg,
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: brand.matrimony,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.favorite,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// What fills the card when there is no photograph to show.
class _Fallback extends StatelessWidget {
  const _Fallback({required this.profile, required this.locked});

  final MatrimonyProfile profile;
  final bool locked;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        GeneratedCover(
          seed: profile.id,
          label: profile.name,
          radius: 0,
          plain: true,
        ),
        // The initial sits high, clear of the text block at the foot.
        Align(
          alignment: const Alignment(0, -0.35),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                profile.name.isEmpty
                    ? '·'
                    : profile.name.characters.first.toUpperCase(),
                style: context.texts.displaySmall?.copyWith(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontSize: 72,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (locked)
                Icon(
                  Icons.lock_outline,
                  size: 20,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Bottom-weighted, and stronger than the cover scrim: this one has to hold a
/// headline against an actual photograph.
class _CardScrim extends StatelessWidget {
  const _CardScrim();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: [0.0, 0.35, 0.62, 1.0],
          colors: [
            Color(0x59000000),
            Color(0x1A000000),
            Color(0x99000000),
            Color(0xE6000000),
          ],
        ),
      ),
      child: SizedBox.expand(),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.text, this.icon});

  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.85)),
          const SizedBox(width: 5),
        ],
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.texts.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.92),
            ),
          ),
        ),
      ],
    );
  }
}

class _Counter extends StatelessWidget {
  const _Counter({required this.page, required this.total});

  final int page;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$page/$total',
        style: context.texts.labelSmall?.copyWith(color: Colors.white),
      ),
    );
  }
}

class _LockedPill extends StatelessWidget {
  const _LockedPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.lock_outline, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.texts.labelSmall?.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _StateChip extends StatelessWidget {
  const _StateChip({required this.state, required this.strings});

  final InterestState state;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    final (label, colour) = switch (state) {
      InterestState.matched => (strings.matchedLabel, brand.matrimony),
      InterestState.sent => (strings.interestSent, Colors.black54),
      InterestState.awaitingMyAnswer => (
        strings.awaitingYourAnswer,
        brand.saffron,
      ),
      InterestState.closed => (strings.declinedLabel, Colors.black54),
      InterestState.none => ('', Colors.black54),
    };

    if (label.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colour,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
