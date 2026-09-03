import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/payment.dart';
import '../../data/models/vendor.dart';
import '../../state/preferences.dart';
import '../../state/vendors.dart';
import '../common/states.dart';
import 'pay_page.dart';

/// A business managing its own listings.
///
/// The app can edit a listing but cannot sell one: Play wants its own billing
/// for anything bought inside an app, so the money leaves through the payer's
/// bank and comes back as a claim a person checks. That is why the pay button
/// here opens a UPI intent rather than a checkout.
class MyServicesPage extends ConsumerWidget {
  const MyServicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final vendors = ref.watch(ownVendorsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.myBusinesses)),
      body: switch (vendors) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(ownVendorsProvider),
        ),
        AsyncData(:final value) when value.isEmpty => EmptyState(
          icon: Icons.storefront_outlined,
          title: strings.noServices,
          // Listing is created on the web: the form is long, and a business
          // filling one in is usually sitting at a desk rather than standing
          // in a hall. The app is where they watch it and pay for it.
          body: strings.pick(
            'Add a business from the website. You can manage and pay for it here.',
            'இணையதளத்தில் பதிவு செய்யுங்கள். இங்கே நிர்வகிக்கலாம்.',
          ),
        ),
        AsyncData(:final value) => ListView.builder(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.md,
            Gap.page,
            Gap.xxl,
          ),
          itemCount: value.length,
          itemBuilder: (context, index) =>
              _OwnListing(vendor: value[index]),
        ),
      },
    );
  }
}

class _OwnListing extends ConsumerWidget {
  const _OwnListing({required this.vendor});

  final Vendor vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;
    final plans = ref.watch(plansProvider('vendor')).value ?? const [];
    final live = vendor.isLive;

    return Container(
      margin: const EdgeInsets.only(bottom: Gap.lg),
      padding: const EdgeInsets.all(Gap.lg),
      decoration: BoxDecoration(
        color: context.scheme.surface,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: brand.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(vendor.name, style: context.texts.titleMedium),
          const SizedBox(height: 2),
          Text(
            strings.pick(vendor.category.label, vendor.category.labelTa),
            style: context.texts.bodySmall,
          ),

          const SizedBox(height: Gap.md),
          Wrap(
            spacing: Gap.sm,
            runSpacing: Gap.sm,
            children: [
              _Chip(
                label: strings.pick(vendor.status.label, vendor.status.labelTa),
                tone: vendor.status == VendorStatus.approved
                    ? brand.matrimony
                    : brand.mutedForeground,
              ),
              // Approved and live are different things, and a business that
              // cannot tell them apart will ring the desk asking why nothing
              // has appeared.
              if (vendor.status == VendorStatus.approved)
                _Chip(
                  label: live ? strings.inTheDirectory : strings.notPaid,
                  tone: live ? brand.matrimony : brand.saffron,
                ),
            ],
          ),

          if (vendor.reviewNote != null) ...[
            const SizedBox(height: Gap.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: brand.muted,
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Text(
                vendor.reviewNote!,
                style: context.texts.bodySmall,
              ),
            ),
          ],

          if (vendor.paidUntil != null) ...[
            const SizedBox(height: Gap.sm),
            Text(
              '${strings.paidUntil} ${Dates.short(vendor.paidUntil)}',
              style: context.texts.bodySmall,
            ),
          ],

          if (vendor.status == VendorStatus.approved && !live) ...[
            const SizedBox(height: Gap.sm),
            Text(
              strings.approvedNeedsPayment,
              style: context.texts.bodySmall?.copyWith(color: brand.saffron),
            ),
          ],

          const SizedBox(height: Gap.md),
          Row(
            children: [
              if (vendor.status != VendorStatus.paused)
                OutlinedButton(
                  onPressed: () => ref
                      .read(vendorRepositoryProvider)
                      .setOwnStatus(vendor.id, VendorStatus.paused),
                  child: Text(strings.pauseListing),
                )
              else
                OutlinedButton(
                  onPressed: () => ref
                      .read(vendorRepositoryProvider)
                      .setOwnStatus(vendor.id, VendorStatus.pending),
                  child: Text(strings.resumeListing),
                ),
              const SizedBox(width: Gap.sm),
              if (plans.isNotEmpty)
                FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (context) => PayPage(
                        plan: plans.first,
                        purpose: PaymentPurpose.vendor,
                        vendorId: vendor.id,
                        vendorName: vendor.name,
                        vendorCategory: vendor.category,
                      ),
                    ),
                  ),
                  child: Text(strings.payNow),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Gap.md, vertical: 4),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(Radii.full),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(color: tone),
      ),
    );
  }
}
