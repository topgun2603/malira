import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/engagement.dart';
import '../../../data/repositories/engagement_repository.dart';
import '../../../state/preferences.dart';
import '../../../state/providers.dart';
import '../../common/app_image.dart';

/// An ad, if the desk has one running for this slot.
///
/// Always labelled, never styled to pass as a story. The label is the point:
/// an ad a reader mistakes for reporting costs the paper its credibility long
/// before it earns the advertiser anything.
class AdSlot extends ConsumerStatefulWidget {
  const AdSlot({super.key, required this.slot});

  final FeedSlot slot;

  @override
  ConsumerState<AdSlot> createState() => _AdSlotState();
}

class _AdSlotState extends ConsumerState<AdSlot> {
  /// Impressions are counted once per mount, not once per rebuild. A scroll
  /// that rebuilds the widget forty times is one impression.
  bool _counted = false;

  void _countOnce(Ad ad) {
    if (_counted) return;
    _counted = true;
    ref.read(engagementRepositoryProvider).recordAdImpression(ad.id);
  }

  Future<void> _open(Ad ad) async {
    final target = Uri.tryParse(ad.ctaUrl);
    if (target == null || ad.ctaUrl.isEmpty) return;

    ref.read(engagementRepositoryProvider).recordAdClick(ad.id);
    await launchUrl(target, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final ad = ref.watch(adForSlotProvider(widget.slot)).value;
    if (ad == null) return const SizedBox.shrink();

    // Scheduled after the frame so a Firestore write is never issued from
    // inside build.
    WidgetsBinding.instance.addPostFrameCallback((_) => _countOnce(ad));

    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.md, Gap.page, Gap.md),
      child: GestureDetector(
        onTap: () => _open(ad),
        behavior: HitTestBehavior.opaque,
        child: Container(
          decoration: BoxDecoration(
            color: context.scheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(Radii.lg),
            border: Border.all(color: brand.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (ad.image != null)
                AspectRatio(
                  aspectRatio: ad.image!.aspectRatio.clamp(1.2, 3.0),
                  child: AppImage(url: ad.image!.url),
                ),
              Padding(
                padding: const EdgeInsets.all(Gap.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: brand.muted,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            strings.sponsored.toUpperCase(),
                            style: context.texts.labelSmall?.copyWith(
                              color: brand.mutedForeground,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        if (ad.advertiser.isNotEmpty) ...[
                          const SizedBox(width: Gap.sm),
                          Flexible(
                            child: Text(
                              ad.advertiser,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: context.texts.bodySmall,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: Gap.sm),
                    Text(
                      strings.pick(ad.headline, ad.headlineTa),
                      style: context.texts.titleMedium,
                    ),
                    if (strings.pick(ad.body, ad.bodyTa).isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        strings.pick(ad.body, ad.bodyTa),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.texts.bodyMedium,
                      ),
                    ],
                    if (ad.ctaLabel.isNotEmpty) ...[
                      const SizedBox(height: Gap.md),
                      Row(
                        children: [
                          Text(
                            ad.ctaLabel,
                            style: context.texts.labelMedium?.copyWith(
                              color: context.scheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward,
                            size: 14,
                            color: context.scheme.primary,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
