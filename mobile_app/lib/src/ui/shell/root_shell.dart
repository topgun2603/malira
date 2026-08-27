import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/palette.dart';
import '../../state/matrimony.dart';
import '../../state/preferences.dart';
import 'app_drawer.dart';

/// Opens the drawer from anywhere.
///
/// Every tab builds its own `Scaffold`, so an `AppBar` inside one cannot find
/// the drawer that lives on the shell above it — Flutter would look up to the
/// nearest Scaffold, which is the page's own, and render no menu button. Naming
/// the shell's Scaffold is the least surprising fix: one key, and any screen in
/// the app can ask for the drawer without the shell having to pass a callback
/// down through every page.
final rootScaffoldKey = GlobalKey<ScaffoldState>(debugLabel: 'root-scaffold');

/// The hamburger. Placed on the masthead and on every page app bar.
class AppMenuButton extends StatelessWidget {
  const AppMenuButton({super.key, this.color});

  final Color? color;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.menu),
      color: color,
      tooltip: MaterialLocalizations.of(context).openAppDrawerTooltip,
      onPressed: () => rootScaffoldKey.currentState?.openDrawer(),
    );
  }
}

/// The five-tab frame.
///
/// Uses an IndexedStack shell so each tab keeps its scroll position and its own
/// back stack — a reader who is eight stories down the feed, checks the events
/// tab and comes back should land where they left, not at the top.
///
/// Matrimony sits in the middle and is lifted clear of the bar. That is not
/// decoration: it is the only destination that is a *place* rather than a feed,
/// the only one behind an account, and the one the association is trying to
/// draw people into. Everything either side of it is the newspaper.
///
/// Saved moved out of the bar and into the drawer — it is a personal shelf
/// somebody visits occasionally, not one of the five things the app is for.
class RootShell extends ConsumerWidget {
  const RootShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      key: rootScaffoldKey,
      drawer: const AppDrawer(),
      body: shell,
      bottomNavigationBar: _BottomBar(shell: shell),
    );
  }
}

class _BottomBar extends ConsumerWidget {
  const _BottomBar({required this.shell});

  final StatefulNavigationShell shell;

  /// The bar itself, before the lift and the system inset.
  static const double _barHeight = 64;

  /// How far the matrimony button rises above the bar.
  static const double _lift = 22;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;
    final scheme = context.scheme;
    final pending = ref.watch(pendingInterestCountProvider);

    // Each tab lights up in its own section accent — the same three-way split
    // globals.css uses: news and events in hill blue, songs in tea green,
    // matrimony in rose. More has no section, so it takes the app primary.
    final tabs = <_TabSpec>[
      _TabSpec(
        icon: Icons.article_outlined,
        activeIcon: Icons.article,
        label: strings.news,
        color: brand.news,
      ),
      _TabSpec(
        icon: Icons.event_outlined,
        activeIcon: Icons.event,
        label: strings.events,
        color: brand.news,
      ),
      // Index 2 is the lifted button; the bar reserves its slot for the label.
      _TabSpec(
        icon: Icons.favorite,
        activeIcon: Icons.favorite,
        label: strings.matrimonyTab,
        color: brand.matrimony,
      ),
      _TabSpec(
        icon: Icons.music_note_outlined,
        activeIcon: Icons.music_note,
        label: strings.songs,
        color: brand.songs,
      ),
      _TabSpec(
        icon: Icons.more_horiz,
        activeIcon: Icons.more_horiz,
        label: strings.more,
        color: scheme.primary,
      ),
    ];

    void go(int index) => shell.goBranch(
      index,
      // Tapping the tab you are already on returns it to its root, which is
      // the gesture people already expect from every other news app.
      initialLocation: index == shell.currentIndex,
    );

    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

    return SizedBox(
      height: _barHeight + _lift + bottomInset,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              height: _barHeight + bottomInset,
              padding: EdgeInsets.only(bottom: bottomInset),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerLow,
                border: Border(top: BorderSide(color: brand.border)),
              ),
              child: Row(
                children: [
                  for (var index = 0; index < tabs.length; index++)
                    Expanded(
                      child: index == 2
                          // The centre slot carries only its label; the button
                          // above supplies the icon.
                          ? _CentreLabel(
                              label: tabs[index].label,
                              selected: shell.currentIndex == 2,
                              color: tabs[index].color,
                              muted: brand.mutedForeground,
                            )
                          : _TabButton(
                              spec: tabs[index],
                              selected: shell.currentIndex == index,
                              muted: brand.mutedForeground,
                              onTap: () => go(index),
                            ),
                    ),
                ],
              ),
            ),
          ),

          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Center(
              child: _MatrimonyButton(
                selected: shell.currentIndex == 2,
                color: brand.matrimony,
                onColor: brand.onMatrimony,
                pending: pending,
                onTap: () => go(2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabSpec {
  const _TabSpec({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;

  /// The section accent this tab lights up in when selected.
  final Color color;
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.spec,
    required this.selected,
    required this.muted,
    required this.onTap,
  });

  final _TabSpec spec;
  final bool selected;
  final Color muted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = selected ? spec.color : muted;

    return InkResponse(
      onTap: onTap,
      radius: 42,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 3),
            decoration: BoxDecoration(
              color: selected
                  ? spec.color.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Icon(
              selected ? spec.activeIcon : spec.icon,
              size: 22,
              color: tint,
            ),
          ),
          const SizedBox(height: 3),
          // Shrink-to-fit rather than ellipsis: a truncated Tamil label is
          // unreadable, whereas a slightly smaller one is merely smaller.
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                spec.label,
                maxLines: 1,
                softWrap: false,
                style: context.texts.labelSmall?.copyWith(
                  color: tint,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The label under the lifted button.
class _CentreLabel extends StatelessWidget {
  const _CentreLabel({
    required this.label,
    required this.selected,
    required this.color,
    required this.muted,
  });

  final String label;
  final bool selected;
  final Color color;
  final Color muted;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            maxLines: 1,
            softWrap: false,
            textAlign: TextAlign.center,
            style: context.texts.labelSmall?.copyWith(
              color: selected ? color : muted,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

/// The raised centre button.
///
/// Ringed in the surface colour so it reads as sitting *above* the bar rather
/// than punched through it — without that ring the circle and the bar merge
/// into one shape wherever they overlap.
class _MatrimonyButton extends StatelessWidget {
  const _MatrimonyButton({
    required this.selected,
    required this.color,
    required this.onColor,
    required this.pending,
    required this.onTap,
  });

  final bool selected;
  final Color color;
  final Color onColor;
  final int pending;
  final VoidCallback onTap;

  static const double _size = 54;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: _size + 10,
        width: _size + 10,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            Container(
              height: _size + 10,
              width: _size + 10,
              decoration: BoxDecoration(
                color: scheme.surface,
                shape: BoxShape.circle,
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOut,
              height: _size,
              width: _size,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: selected ? 0.45 : 0.26),
                    blurRadius: selected ? 16 : 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(
                selected ? Icons.favorite : Icons.favorite_border,
                color: onColor,
                size: 26,
              ),
            ),

            // Unanswered interests, on the button because that is where a
            // member will look for them.
            if (pending > 0)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: context.brand.saffron,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: scheme.surface, width: 2),
                  ),
                  child: Text(
                    '$pending',
                    style: context.texts.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// The EN / தமிழ் switch.
///
/// A segmented pill rather than a dropdown: two options, both always visible,
/// each labelled in its own script so a Tamil reader can find it without being
/// able to read the English one.
class LanguageToggle extends ConsumerWidget {
  const LanguageToggle({super.key, this.onDark = false});

  /// Set when the toggle sits on the dark masthead rather than on paper.
  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(
      preferencesProvider.select((preferences) => preferences.language),
    );
    final scheme = context.scheme;
    final brand = context.brand;

    final trackColor = onDark
        ? Colors.white.withValues(alpha: 0.14)
        : brand.muted;
    final selectedColor = onDark ? Colors.white : scheme.primary;
    final selectedTextColor = onDark ? brand.rail : scheme.onPrimary;
    final idleTextColor = onDark
        ? Colors.white.withValues(alpha: 0.82)
        : brand.mutedForeground;

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: trackColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final language in ReaderLanguage.values)
            _Segment(
              label: language == ReaderLanguage.en ? 'EN' : 'தமிழ்',
              selected: current == language,
              selectedColor: selectedColor,
              selectedTextColor: selectedTextColor,
              idleTextColor: idleTextColor,
              onTap: () => ref
                  .read(preferencesProvider.notifier)
                  .setLanguage(language),
            ),
        ],
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.selected,
    required this.selectedColor,
    required this.selectedTextColor,
    required this.idleTextColor,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color selectedColor;
  final Color selectedTextColor;
  final Color idleTextColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? selectedColor : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: context.texts.labelMedium?.copyWith(
              color: selected ? selectedTextColor : idleTextColor,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
