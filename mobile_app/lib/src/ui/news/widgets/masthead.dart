import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../shell/root_shell.dart';

/// The news masthead.
///
/// Hill blue, matching the section accent the rest of the news screens carry —
/// the tabs, the category chips, the links inside a story. A green masthead
/// over blue content was the one place the section colouring did not follow
/// through.
///
/// It is pinned: the masthead is the app's identity and its way back to the
/// drawer, the search and the language switch, so it stays put while the
/// category rail below it scrolls away with the feed.
///
/// **Layout.** Expanded and collapsed are two separate layers that cross-fade,
/// rather than one layer with interpolated padding. The interpolated version
/// drifted out of line with the menu button as it shrank, and a long Tamil
/// title could ride up into the language switcher — both because the title was
/// being positioned by hand while `leading` and `actions` were positioned by
/// the AppBar. Here the collapsed title is pinned to the toolbar line by
/// construction and the expanded block is held below the toolbar, so neither
/// can collide with anything.
class MastheadSliver extends StatelessWidget {
  const MastheadSliver({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.dateLine,
    this.onSearch,
    this.trailing,
    this.actions,
  });

  final String eyebrow;
  final String title;
  final String dateLine;
  final VoidCallback? onSearch;
  final Widget? trailing;

  /// Extra buttons, before the search. The notification bell goes here.
  final List<Widget>? actions;

  /// Room the toolbar row needs. Everything expanded is kept below this.
  static const double _toolbar = 56;
  static const double _expanded = 168;
  static const double _collapsed = 64;

  @override
  Widget build(BuildContext context) {
    final base = context.brand.news;

    return SliverAppBar(
      pinned: true,
      expandedHeight: _expanded,
      collapsedHeight: _collapsed,
      backgroundColor: base,
      foregroundColor: Colors.white,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      // The masthead is dark in both themes, so the status bar icons above it
      // are always light regardless of what the rest of the app is doing.
      systemOverlayStyle: SystemUiOverlayStyle.light,
      toolbarHeight: _toolbar,
      // The whole toolbar is built inside flexibleSpace instead of being split
      // between `leading`, `title` and `actions`. Laid out by the AppBar, the
      // collapsed wordmark and the buttons are positioned independently and
      // nothing stops them meeting in the middle — which is exactly what a long
      // Tamil title did. As one Row they cannot overlap by construction: the
      // wordmark takes what is left after the buttons and shrinks to fit it.
      automaticallyImplyLeading: false,
      flexibleSpace: LayoutBuilder(
        builder: (context, constraints) {
          final top = MediaQuery.paddingOf(context).top;
          final openness =
              ((constraints.maxHeight - (_collapsed + top)) /
                      (_expanded - _collapsed))
                  .clamp(0.0, 1.0);

          return _MastheadBackground(
            eyebrow: eyebrow,
            title: title,
            dateLine: dateLine,
            openness: openness,
            base: base,
            toolbar: _toolbar,
            actions: [
              ...?actions,
              if (trailing != null) ...[trailing!, const SizedBox(width: 2)],
              if (onSearch != null)
                IconButton(
                  onPressed: onSearch,
                  icon: const Icon(Icons.search),
                  color: Colors.white,
                  tooltip: MaterialLocalizations.of(context).searchFieldLabel,
                ),
              const SizedBox(width: Gap.xs),
            ],
          );
        },
      ),
    );
  }
}

class _MastheadBackground extends StatelessWidget {
  const _MastheadBackground({
    required this.eyebrow,
    required this.title,
    required this.dateLine,
    required this.openness,
    required this.base,
    required this.toolbar,
    required this.actions,
  });

  final String eyebrow;
  final String title;
  final String dateLine;

  /// 1 fully expanded, 0 collapsed to the toolbar.
  final double openness;

  final Color base;
  final double toolbar;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final top = MediaQuery.paddingOf(context).top;

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color.lerp(base, Colors.black, 0.42)!, base],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // The hills the district is named after. Faint enough to be texture
          // rather than illustration.
          const Positioned.fill(child: CustomPaint(painter: _HillsPainter())),

          // The toolbar: menu, the collapsed wordmark, then the buttons. The
          // wordmark sits in the Expanded slot, so it gets whatever room the
          // buttons leave and never a pixel more.
          Positioned(
            top: top,
            left: 0,
            right: 0,
            height: toolbar,
            child: Row(
              children: [
                const AppMenuButton(color: Colors.white),
                Expanded(
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: (1 - openness * 2).clamp(0.0, 1.0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: _Wordmark(text: title, expanded: false),
                      ),
                    ),
                  ),
                ),
                ...actions,
              ],
            ),
          ),

          // Expanded: the full block, held below the toolbar so it can never
          // reach the language switcher however long the Tamil title runs.
          Positioned(
            top: top + toolbar,
            left: Gap.page,
            right: Gap.page,
            bottom: Gap.md,
            child: IgnorePointer(
              child: Opacity(
                opacity: (openness * 1.5 - 0.2).clamp(0.0, 1.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eyebrow,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.labelSmall?.copyWith(
                        color: brand.saffron,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 2),
                    _Wordmark(text: title, expanded: true),
                    const SizedBox(height: 2),
                    Text(
                      dateLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.72),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The wordmark, sized so Tamil and English occupy the same band.
///
/// Noto Sans Tamil sets visibly larger than Geist at the same point size, and
/// "நீலகிரி செய்திகள்" is half again as long as "Nilgiri News" — left alone it
/// overran the bar. The size is stepped down for Tamil and the whole thing is
/// allowed to shrink rather than clip, so neither script can push past its row.
class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.text, required this.expanded});

  final String text;
  final bool expanded;

  /// Any Tamil codepoint. Cheaper and more reliable than asking the language
  /// setting, because a bilingual masthead is possible in principle.
  static final _tamil = RegExp(r'[஀-௿]');

  @override
  Widget build(BuildContext context) {
    final isTamil = _tamil.hasMatch(text);

    final size = expanded ? (isTamil ? 25.0 : 31.0) : (isTamil ? 17.0 : 20.0);

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        maxLines: 1,
        softWrap: false,
        style: context.texts.displaySmall?.copyWith(
          color: Colors.white,
          fontSize: size,
          height: 1.15,
        ),
      ),
    );
  }
}

/// Three overlapping ridgelines.
class _HillsPainter extends CustomPainter {
  const _HillsPainter();

  @override
  void paint(Canvas canvas, Size size) {
    const ridges = <({double heightFactor, double phase, double opacity})>[
      (heightFactor: 0.52, phase: 0.0, opacity: 0.05),
      (heightFactor: 0.68, phase: 1.4, opacity: 0.07),
      (heightFactor: 0.84, phase: 2.6, opacity: 0.09),
    ];

    for (final ridge in ridges) {
      final paint = Paint()
        ..color = Colors.white.withValues(alpha: ridge.opacity)
        ..style = PaintingStyle.fill;

      final path = Path()..moveTo(0, size.height);
      final baseline = size.height * ridge.heightFactor;
      const steps = 48;

      for (var step = 0; step <= steps; step++) {
        final x = size.width * step / steps;
        final wave =
            math.sin(step / steps * math.pi * 1.6 + ridge.phase) * 0.55 +
            math.sin(step / steps * math.pi * 3.4 + ridge.phase * 2) * 0.2;
        path.lineTo(x, baseline - wave * size.height * 0.16);
      }

      path
        ..lineTo(size.width, size.height)
        ..close();

      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _HillsPainter oldDelegate) => false;
}

/// The plain app bar used by every screen that is not the front page.
class PageAppBar extends StatelessWidget implements PreferredSizeWidget {
  const PageAppBar({
    super.key,
    required this.title,
    this.actions,
    this.showMenu = false,
  });

  final String title;
  final List<Widget>? actions;

  /// Set on the screens that sit inside a tab. A pushed screen keeps its back
  /// arrow instead — replacing it with a hamburger would strand the reader.
  final bool showMenu;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: showMenu ? const AppMenuButton() : null,
      title: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: context.texts.titleLarge,
      ),
      actions: actions,
      shape: Border(bottom: BorderSide(color: context.brand.border)),
    );
  }
}
