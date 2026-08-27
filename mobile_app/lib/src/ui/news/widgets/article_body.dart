import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';

/// Renders the Tiptap HTML the admin editor produces.
///
/// The style map is a direct translation of `.tiptap-content` in
/// `web-admin/src/app/globals.css`. That file is the contract between what an
/// editor sees while writing and what a reader gets — a blockquote that is
/// indented and italic on the web and plain here means the desk cannot trust
/// its own preview.
///
/// Tiptap emits a known, small set of tags (p, h2, h3, ul, ol, li, blockquote,
/// a, img, strong, em), which is why this is a fixed map rather than a general
/// HTML renderer.
class ArticleBody extends StatelessWidget {
  const ArticleBody({super.key, required this.html});

  final String html;

  @override
  Widget build(BuildContext context) {
    if (html.trim().isEmpty) return const SizedBox.shrink();

    final scheme = context.scheme;
    final brand = context.brand;
    final texts = context.texts;

    // The reader's size control is applied by MediaQuery at the top of the app;
    // flutter_html does not read TextScaler, so the base size is resolved here
    // from the already-scaled body style and handed over explicitly.
    final baseSize = MediaQuery.textScalerOf(context).scale(
      texts.bodyLarge?.fontSize ?? 17,
    );

    return Html(
      data: html,
      onLinkTap: (url, _, _) async {
        if (url == null) return;
        final target = Uri.tryParse(url);
        if (target == null) return;
        await launchUrl(target, mode: LaunchMode.externalApplication);
      },
      style: {
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(baseSize),
          lineHeight: const LineHeight(1.62),
          color: scheme.onSurface,
          fontFamily: 'Geist',
        ),
        'p': Style(
          margin: Margins.only(top: 0, bottom: 16),
        ),
        'h2': Style(
          margin: Margins.only(top: 28, bottom: 8),
          fontSize: FontSize(baseSize * 1.28),
          fontWeight: FontWeight.w600,
          lineHeight: const LineHeight(1.3),
        ),
        'h3': Style(
          margin: Margins.only(top: 22, bottom: 8),
          fontSize: FontSize(baseSize * 1.12),
          fontWeight: FontWeight.w600,
          lineHeight: const LineHeight(1.35),
        ),
        'ul': Style(margin: Margins.only(top: 0, bottom: 16, left: 20)),
        'ol': Style(margin: Margins.only(top: 0, bottom: 16, left: 20)),
        'li': Style(margin: Margins.only(bottom: 6)),
        'blockquote': Style(
          margin: Margins.symmetric(vertical: 20, horizontal: 0),
          padding: HtmlPaddings.only(left: 16),
          border: Border(
            left: BorderSide(
              color: scheme.primary.withValues(alpha: 0.4),
              width: 2,
            ),
          ),
          fontStyle: FontStyle.italic,
          color: brand.mutedForeground,
        ),
        'a': Style(
          color: scheme.primary,
          textDecoration: TextDecoration.underline,
          textDecorationColor: scheme.primary.withValues(alpha: 0.4),
        ),
        'strong': Style(fontWeight: FontWeight.w600),
        'img': Style(margin: Margins.symmetric(vertical: 16)),
        'figcaption': Style(
          fontSize: FontSize(baseSize * 0.8),
          color: brand.mutedForeground,
          textAlign: TextAlign.center,
        ),
      },
    );
  }
}

/// The standfirst — the summary, set apart from the body.
///
/// A saffron rule down the left rather than a box: it marks the summary as a
/// different kind of text without interrupting the column the eye is about to
/// read down.
class Standfirst extends StatelessWidget {
  const Standfirst({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.trim().isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.only(left: Gap.md),
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(color: context.brand.saffron, width: 3),
        ),
      ),
      child: Text(
        text,
        style: context.texts.bodyLarge?.copyWith(
          color: context.brand.mutedForeground,
          height: 1.55,
        ),
      ),
    );
  }
}
