import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'palette.dart';

/// The two themes, built from [Palette] and nothing else.
abstract final class AppTheme {
  const AppTheme._();

  /// Latin first, Tamil as the fallback the engine reaches for automatically.
  ///
  /// This is why no widget in the app ever picks a font. A headline that is
  /// half English and half Tamil resolves per-glyph at the same weight, which
  /// is the point of the agreed type pairing: switching language must not
  /// change the texture of the page.
  static const _family = 'Geist';
  static const _fallback = <String>['NotoSansTamil'];

  static ThemeData light() => _build(
    brightness: Brightness.light,
    scheme: const ColorScheme.light(
      primary: Palette.lightPrimary,
      onPrimary: Palette.lightPrimaryForeground,
      primaryContainer: Palette.lightPrimary,
      onPrimaryContainer: Palette.lightPrimaryForeground,
      secondary: Palette.lightSecondaryForeground,
      onSecondary: Palette.lightSecondary,
      secondaryContainer: Palette.lightSecondary,
      onSecondaryContainer: Palette.lightSecondaryForeground,
      tertiary: Palette.lightSaffron,
      onTertiary: Palette.lightPrimaryForeground,
      tertiaryContainer: Palette.lightAccent,
      onTertiaryContainer: Palette.lightAccentForeground,
      error: Palette.lightDestructive,
      onError: Palette.lightPrimaryForeground,
      surface: Palette.lightBackground,
      onSurface: Palette.lightForeground,
      surfaceContainerLowest: Palette.lightCard,
      surfaceContainerLow: Palette.lightCard,
      surfaceContainer: Palette.lightMuted,
      surfaceContainerHigh: Palette.lightMuted,
      surfaceContainerHighest: Palette.lightMuted,
      onSurfaceVariant: Palette.lightMutedForeground,
      outline: Palette.lightBorder,
      outlineVariant: Palette.lightBorder,
      inverseSurface: Palette.lightRail,
      onInverseSurface: Palette.lightRailForeground,
    ),
    brand: BrandColors.light,
  );

  static ThemeData dark() => _build(
    brightness: Brightness.dark,
    scheme: const ColorScheme.dark(
      primary: Palette.darkPrimary,
      onPrimary: Palette.darkPrimaryForeground,
      primaryContainer: Palette.darkPrimary,
      onPrimaryContainer: Palette.darkPrimaryForeground,
      secondary: Palette.darkSecondaryForeground,
      onSecondary: Palette.darkSecondary,
      secondaryContainer: Palette.darkSecondary,
      onSecondaryContainer: Palette.darkSecondaryForeground,
      tertiary: Palette.darkSaffron,
      onTertiary: Palette.darkPrimaryForeground,
      tertiaryContainer: Palette.darkAccent,
      onTertiaryContainer: Palette.darkAccentForeground,
      error: Palette.darkDestructive,
      onError: Palette.darkPrimaryForeground,
      surface: Palette.darkBackground,
      onSurface: Palette.darkForeground,
      surfaceContainerLowest: Palette.darkBackground,
      surfaceContainerLow: Palette.darkCard,
      surfaceContainer: Palette.darkCard,
      surfaceContainerHigh: Palette.darkMuted,
      surfaceContainerHighest: Palette.darkMuted,
      onSurfaceVariant: Palette.darkMutedForeground,
      outline: Palette.darkBorder,
      outlineVariant: Palette.darkBorder,
      inverseSurface: Palette.darkRailForeground,
      onInverseSurface: Palette.darkRail,
    ),
    brand: BrandColors.dark,
  );

  static ThemeData _build({
    required Brightness brightness,
    required ColorScheme scheme,
    required BrandColors brand,
  }) {
    final texts = _textTheme(scheme.onSurface, brand.mutedForeground);

    return ThemeData(
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      fontFamily: _family,
      fontFamilyFallback: _fallback,
      textTheme: texts,
      extensions: [brand],
      splashFactory: InkSparkle.splashFactory,

      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: texts.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        systemOverlayStyle: brightness == Brightness.light
            ? SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light,
      ),

      cardTheme: CardThemeData(
        color: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.lg),
          side: BorderSide(color: brand.border),
        ),
      ),

      dividerTheme: DividerThemeData(
        color: brand.border,
        thickness: 1,
        space: 1,
      ),

      chipTheme: ChipThemeData(
        backgroundColor: scheme.secondaryContainer,
        labelStyle: texts.labelMedium!.copyWith(
          color: scheme.onSecondaryContainer,
        ),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.full),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          textStyle: texts.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radii.md),
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 48),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          textStyle: texts.labelLarge,
          side: BorderSide(color: brand.border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radii.md),
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          textStyle: texts.labelLarge,
          foregroundColor: scheme.primary,
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.inverseSurface,
        contentTextStyle: texts.bodyMedium?.copyWith(
          color: scheme.onInverseSurface,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.xl)),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: Colors.transparent,
        indicatorColor: brightness == Brightness.light
            ? Palette.lightAccent
            : Palette.darkAccent,
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStatePropertyAll(
          texts.labelSmall?.copyWith(fontWeight: FontWeight.w500),
        ),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
        linearTrackColor: brand.muted,
        circularTrackColor: brand.muted,
      ),
    );
  }

  /// Editorial type scale.
  ///
  /// Body starts at 17sp rather than the Material default of 14. The readership
  /// skews old, and a district news app that needs pinch-zoom to read has
  /// failed before it is opened. The reader size control scales on top of this.
  static TextTheme _textTheme(Color fg, Color muted) {
    TextStyle s(
      double size,
      FontWeight weight,
      double height, {
      double track = 0,
      Color? color,
    }) {
      return TextStyle(
        fontSize: size,
        fontWeight: weight,
        height: height,
        letterSpacing: track,
        color: color ?? fg,
      );
    }

    return TextTheme(
      // Reserved for the masthead and the article headline.
      displaySmall: s(32, FontWeight.w700, 1.18, track: -0.7),
      headlineLarge: s(28, FontWeight.w700, 1.2, track: -0.6),
      headlineMedium: s(24, FontWeight.w600, 1.22, track: -0.4),
      headlineSmall: s(20, FontWeight.w600, 1.28, track: -0.3),
      titleLarge: s(18, FontWeight.w600, 1.32, track: -0.2),
      titleMedium: s(16, FontWeight.w600, 1.35),
      titleSmall: s(14, FontWeight.w600, 1.4),
      bodyLarge: s(17, FontWeight.w400, 1.62),
      bodyMedium: s(15, FontWeight.w400, 1.55, color: muted),
      bodySmall: s(13, FontWeight.w400, 1.5, color: muted),
      labelLarge: s(15, FontWeight.w500, 1.2),
      labelMedium: s(13, FontWeight.w500, 1.2),
      labelSmall: s(12, FontWeight.w500, 1.2, track: 0.1),
    );
  }
}

/// Re-tints a subtree the way the admin panel's `[data-section]` wrapper does.
///
/// On the web, a section accent works by overriding `--primary` on one wrapper
/// element: custom properties inherit, so every button, chip, ring and link
/// inside re-tints with no component changes at all. This is the same idea in
/// Flutter — one `Theme` above the section, and every descendant that asks for
/// `colorScheme.primary` gets rose instead of tea green.
///
/// Deliberately moves only primary and its foreground. The saffron accent stays
/// put across the whole app, exactly as globals.css says it must.
class SectionTheme extends StatelessWidget {
  const SectionTheme({
    super.key,
    required this.primary,
    required this.onPrimary,
    required this.child,
  });

  /// Matrimony rose.
  factory SectionTheme.matrimony({
    required BuildContext context,
    required Widget child,
  }) {
    final brand = Theme.of(context).extension<BrandColors>()!;
    return SectionTheme(
      primary: brand.matrimony,
      onPrimary: brand.onMatrimony,
      child: child,
    );
  }

  /// Hill blue — news, events and the archive.
  factory SectionTheme.news({
    required BuildContext context,
    required Widget child,
  }) {
    final brand = Theme.of(context).extension<BrandColors>()!;
    return SectionTheme(
      primary: brand.news,
      onPrimary: brand.onNews,
      child: child,
    );
  }

  /// Tea green — songs.
  factory SectionTheme.songs({
    required BuildContext context,
    required Widget child,
  }) {
    final brand = Theme.of(context).extension<BrandColors>()!;
    return SectionTheme(
      primary: brand.songs,
      onPrimary: brand.onSongs,
      child: child,
    );
  }

  final Color primary;
  final Color onPrimary;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Theme(
      data: theme.copyWith(
        colorScheme: theme.colorScheme.copyWith(
          primary: primary,
          onPrimary: onPrimary,
          primaryContainer: primary,
          onPrimaryContainer: onPrimary,
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            textStyle: theme.textTheme.labelLarge,
            foregroundColor: primary,
          ),
        ),
        progressIndicatorTheme: theme.progressIndicatorTheme.copyWith(
          color: primary,
        ),
      ),
      child: child,
    );
  }
}

/// Radii mirror `--radius: 0.7rem` and its derived steps in globals.css.
abstract final class Radii {
  const Radii._();
  static const double sm = 6.7;
  static const double md = 9.0;
  static const double lg = 11.2;
  static const double xl = 15.7;
  static const double xxl = 20.2;
  static const double full = 999;
}

/// One spacing scale, so padding is chosen from a list rather than invented.
abstract final class Gap {
  const Gap._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double page = 20;
}
