import 'package:flutter/material.dart';

/// The RK Matrimony palette.
///
/// These are not new colours. Every value is the sRGB conversion of an OKLCH
/// token in `web-admin/src/app/globals.css`, so the app and the admin panel are
/// the same product rather than two that merely look similar. If a token moves
/// there, it moves here — and nowhere else in this app is a colour written by
/// hand.
///
/// Brief: deep tea-garden green (primary), misty blue-grey (secondary), warm
/// paper surfaces, saffron-terracotta reserved for actions and events.
abstract final class Palette {
  const Palette._();

  // --------------------------------- Light ---------------------------------
  // Warm paper, not clinical white — long articles are read on this.
  static const lightBackground = Color(0xFFFCFBF8);
  static const lightForeground = Color(0xFF141D19);
  static const lightCard = Color(0xFFFFFFFF);
  static const lightPrimary = Color(0xFF1F6140);
  static const lightPrimaryForeground = Color(0xFFF6FCF7);
  static const lightSecondary = Color(0xFFE5EFF3);
  static const lightSecondaryForeground = Color(0xFF22363E);
  static const lightMuted = Color(0xFFF0F2EE);
  static const lightMutedForeground = Color(0xFF5D6D67);
  static const lightAccent = Color(0xFFF8E8D4);
  static const lightAccentForeground = Color(0xFF613109);
  static const lightDestructive = Color(0xFFCD2E2A);
  static const lightBorder = Color(0xFFDAE0DC);
  static const lightSaffron = Color(0xFFDD872B);
  static const lightMist = Color(0xFF8EAAB7);
  // The navy rail — `--sidebar` in globals.css, where it backs the admin
  // drawer. Here it backs the app drawer and the launcher tile, and it plays
  // the same role in both: navigation sits on it, editorial does not.
  //
  // It is hill blue rather than tea green because the masthead above the feed
  // is already `news` blue, so the two pieces of chrome a reader meets first
  // look cut from the same cloth.
  static const lightRail = Color(0xFF13253F);
  static const lightRailForeground = Color(0xFFDEE9F5);

  /// The RK Matrimony brand ground, and the deeper rose it ramps out of.
  ///
  /// The launcher tile and the painted mark are drawn on this gradient. It is
  /// the matrimony rose rather than the tea green the app used to wear: the
  /// product is called RK Matrimony and opens on matrimony, so the mark a reader
  /// taps should be the colour of the place it opens.
  static const lightBrandDeep = Color(0xFF5E1E3B);
  static const lightBrand = lightMatrimony;

  /// Matrimony rose.
  ///
  /// The admin panel gives each reader section its own accent by overriding
  /// `--primary` on a wrapper (`[data-section="matrimony"]` in globals.css).
  /// Matrimony gets rose so it reads as a separate place from the newsroom —
  /// which matters more here than on the web, because on a phone the section
  /// fills the whole screen and there is no surrounding chrome to orient by.
  static const lightMatrimony = Color(0xFF9C3464);
  static const lightOnMatrimony = Color(0xFFFFFAFC);

  /// News, events and the archive carry hill blue; songs keep the tea green
  /// that is also the app default. Same three-way split as globals.css.
  /// Cover tints, converted from `--chart-1` .. `--chart-5` in globals.css.
  ///
  /// Used to generate a cover when there is no real image — a playlist with no
  /// artwork, an event with no poster. A tinted card that clearly belongs to
  /// the palette reads as a deliberate placeholder; a grey rectangle reads as
  /// something that failed to load.
  static const lightCovers = <Color>[
    Color(0xFF2B7A52),
    Color(0xFF509DBE),
    Color(0xFFE28E3A),
    Color(0xFFC8664E),
    Color(0xFF9B9D5A),
  ];

  static const lightNews = Color(0xFF145892);
  static const lightOnNews = Color(0xFFF8FAFD);
  static const lightSongs = lightPrimary;
  static const lightOnSongs = lightPrimaryForeground;

  // ---------------------------------- Dark ---------------------------------
  static const darkBackground = Color(0xFF0C1411);
  static const darkForeground = Color(0xFFEAEFEB);
  static const darkCard = Color(0xFF151F1B);
  static const darkPrimary = Color(0xFF68BC8E);
  static const darkPrimaryForeground = Color(0xFF05160E);
  static const darkSecondary = Color(0xFF202D32);
  static const darkSecondaryForeground = Color(0xFFE0EAEE);
  static const darkMuted = Color(0xFF202926);
  static const darkMutedForeground = Color(0xFF95A29C);
  static const darkAccent = Color(0xFF3E2D1E);
  static const darkAccentForeground = Color(0xFFF9D7B4);
  static const darkDestructive = Color(0xFFF96467);
  static const darkBorder = Color(0xFF2A332F);
  static const darkSaffron = Color(0xFFEE9C46);
  static const darkMist = Color(0xFF7C97A4);
  static const darkRail = Color(0xFF0F2438);
  static const darkRailForeground = Color(0xFFDEE9F5);

  static const darkMatrimony = Color(0xFFEE8AB2);
  static const darkOnMatrimony = Color(0xFF210B15);

  static const darkCovers = <Color>[
    Color(0xFF5DB384),
    Color(0xFF63B0D1),
    Color(0xFFF6A14F),
    Color(0xFFE37F65),
    Color(0xFFB4B672),
  ];

  static const darkNews = Color(0xFF67AAED);
  static const darkOnNews = Color(0xFF031222);
  static const darkSongs = darkPrimary;
  static const darkOnSongs = darkPrimaryForeground;
}

/// Tokens that Material's [ColorScheme] has no slot for.
///
/// Reached through `Theme.of(context).extension<BrandColors>()!`, so a widget
/// never has to know whether the app is light or dark to ask for the saffron.
@immutable
class BrandColors extends ThemeExtension<BrandColors> {
  const BrandColors({
    required this.saffron,
    required this.mist,
    required this.rail,
    required this.railForeground,
    required this.muted,
    required this.mutedForeground,
    required this.border,
    required this.matrimony,
    required this.onMatrimony,
    required this.news,
    required this.onNews,
    required this.songs,
    required this.onSongs,
  });

  final Color saffron;
  final Color mist;
  final Color rail;
  final Color railForeground;
  final Color muted;
  final Color mutedForeground;
  final Color border;

  /// The matrimony section accent. Note that the saffron does NOT change with
  /// the section: it is the one loud colour reserved for actions across the
  /// whole product, and letting it drift per section would leave nothing
  /// constant to anchor on. That reasoning is the web's, and it holds here.
  final Color matrimony;
  final Color onMatrimony;

  /// Hill blue — news, events and the archive.
  final Color news;
  final Color onNews;

  /// Tea green — songs, and the app default everywhere unsectioned.
  final Color songs;
  final Color onSongs;

  static const light = BrandColors(
    saffron: Palette.lightSaffron,
    mist: Palette.lightMist,
    rail: Palette.lightRail,
    railForeground: Palette.lightRailForeground,
    muted: Palette.lightMuted,
    mutedForeground: Palette.lightMutedForeground,
    border: Palette.lightBorder,
    matrimony: Palette.lightMatrimony,
    onMatrimony: Palette.lightOnMatrimony,
    news: Palette.lightNews,
    onNews: Palette.lightOnNews,
    songs: Palette.lightSongs,
    onSongs: Palette.lightOnSongs,
  );

  static const dark = BrandColors(
    saffron: Palette.darkSaffron,
    mist: Palette.darkMist,
    rail: Palette.darkRail,
    railForeground: Palette.darkRailForeground,
    muted: Palette.darkMuted,
    mutedForeground: Palette.darkMutedForeground,
    border: Palette.darkBorder,
    matrimony: Palette.darkMatrimony,
    onMatrimony: Palette.darkOnMatrimony,
    news: Palette.darkNews,
    onNews: Palette.darkOnNews,
    songs: Palette.darkSongs,
    onSongs: Palette.darkOnSongs,
  );

  @override
  BrandColors copyWith({
    Color? saffron,
    Color? mist,
    Color? rail,
    Color? railForeground,
    Color? muted,
    Color? mutedForeground,
    Color? border,
    Color? matrimony,
    Color? onMatrimony,
    Color? news,
    Color? onNews,
    Color? songs,
    Color? onSongs,
  }) {
    return BrandColors(
      saffron: saffron ?? this.saffron,
      mist: mist ?? this.mist,
      rail: rail ?? this.rail,
      railForeground: railForeground ?? this.railForeground,
      muted: muted ?? this.muted,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      border: border ?? this.border,
      matrimony: matrimony ?? this.matrimony,
      onMatrimony: onMatrimony ?? this.onMatrimony,
      news: news ?? this.news,
      onNews: onNews ?? this.onNews,
      songs: songs ?? this.songs,
      onSongs: onSongs ?? this.onSongs,
    );
  }

  @override
  BrandColors lerp(covariant BrandColors? other, double t) {
    if (other == null) return this;
    return BrandColors(
      saffron: Color.lerp(saffron, other.saffron, t)!,
      mist: Color.lerp(mist, other.mist, t)!,
      rail: Color.lerp(rail, other.rail, t)!,
      railForeground: Color.lerp(railForeground, other.railForeground, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
      border: Color.lerp(border, other.border, t)!,
      matrimony: Color.lerp(matrimony, other.matrimony, t)!,
      onMatrimony: Color.lerp(onMatrimony, other.onMatrimony, t)!,
      news: Color.lerp(news, other.news, t)!,
      onNews: Color.lerp(onNews, other.onNews, t)!,
      songs: Color.lerp(songs, other.songs, t)!,
      onSongs: Color.lerp(onSongs, other.onSongs, t)!,
    );
  }
}

/// Sugar so widgets read `context.brand.saffron` instead of the full lookup.
extension BrandTheme on BuildContext {
  BrandColors get brand => Theme.of(this).extension<BrandColors>()!;
  ColorScheme get scheme => Theme.of(this).colorScheme;
  TextTheme get texts => Theme.of(this).textTheme;
}
