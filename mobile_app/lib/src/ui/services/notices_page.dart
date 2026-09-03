import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/payment.dart';
import '../../state/auth.dart';
import '../../state/preferences.dart';
import '../../state/vendors.dart';
import '../common/states.dart';

/// What the desk has told this account.
///
/// Verification is manual, so somebody who has paid is waiting on a person.
/// Without this the only signal either way is silence, which is
/// indistinguishable from the desk having lost the payment — and a rejection
/// nobody reads is a rejection they will ring about.
class NoticesPage extends ConsumerWidget {
  const NoticesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final notices = ref.watch(noticesProvider);
    final payments = ref.watch(ownPaymentsProvider).value ?? const [];
    final brand = context.brand;

    return Scaffold(
      appBar: AppBar(title: Text(strings.notices)),
      body: switch (notices) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(noticesProvider),
        ),
        AsyncData(:final value) when value.isEmpty && payments.isEmpty =>
          EmptyState(
            icon: Icons.notifications_none,
            title: strings.noNotices,
            body: strings.pick(
              'Anything the desk tells you about a payment appears here.',
              'கட்டணம் குறித்த தகவல்கள் இங்கே தோன்றும்.',
            ),
          ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.md,
            Gap.page,
            Gap.xxl,
          ),
          children: [
            for (final notice in value)
              _NoticeTile(notice: notice, brand: brand),

            if (payments.isNotEmpty) ...[
              const SizedBox(height: Gap.lg),
              Text(strings.myPayments, style: context.texts.titleSmall),
              const SizedBox(height: Gap.sm),
              for (final payment in payments)
                _PaymentTile(payment: payment, brand: brand),
            ],
          ],
        ),
      },
    );
  }
}

class _NoticeTile extends ConsumerWidget {
  const _NoticeTile({required this.notice, required this.brand});

  final UserNotice notice;
  final BrandColors brand;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = ref.watch(currentUidProvider);

    return Container(
      margin: const EdgeInsets.only(bottom: Gap.md),
      padding: const EdgeInsets.all(Gap.lg),
      decoration: BoxDecoration(
        // Unread carries a tint rather than a dot: the point is that it catches
        // the eye of somebody who opened the app to find out what happened.
        color: notice.read ? context.scheme.surface : brand.muted,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: brand.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                notice.kind.endsWith('rejected')
                    ? Icons.error_outline
                    : Icons.check_circle_outline,
                size: 18,
                color: notice.kind.endsWith('rejected')
                    ? context.scheme.error
                    : brand.matrimony,
              ),
              const SizedBox(width: Gap.sm),
              Expanded(
                child: Text(notice.title, style: context.texts.titleSmall),
              ),
              if (!notice.read && uid != null)
                TextButton(
                  onPressed: () => ref
                      .read(paymentRepositoryProvider)
                      .markNoticeRead(uid, notice.id),
                  child: Text(
                    ref.read(stringsProvider).pick('Mark read', 'படித்தேன்'),
                  ),
                ),
            ],
          ),
          const SizedBox(height: Gap.sm),
          Text(notice.body, style: context.texts.bodyMedium),
          if (notice.createdAt != null) ...[
            const SizedBox(height: Gap.sm),
            Text(
              Dates.short(notice.createdAt),
              style: context.texts.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _PaymentTile extends ConsumerWidget {
  const _PaymentTile({required this.payment, required this.brand});

  final PaymentRequest payment;
  final BrandColors brand;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final rupees = (payment.amountInPaise / 100).round();

    return Container(
      margin: const EdgeInsets.only(bottom: Gap.md),
      padding: const EdgeInsets.all(Gap.lg),
      decoration: BoxDecoration(
        color: context.scheme.surface,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: brand.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '₹$rupees · ${payment.planName}',
                  style: context.texts.titleSmall,
                ),
              ),
              Text(
                strings.pick(payment.status.label, payment.status.labelTa),
                style: context.texts.labelSmall?.copyWith(
                  color: switch (payment.status) {
                    PaymentStatus.approved => brand.matrimony,
                    PaymentStatus.rejected => context.scheme.error,
                    PaymentStatus.submitted => brand.mutedForeground,
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            '${payment.reference}'
            '${payment.createdAt == null ? "" : " · ${Dates.short(payment.createdAt)}"}',
            style: context.texts.bodySmall,
          ),

          if (payment.status == PaymentStatus.submitted) ...[
            const SizedBox(height: Gap.sm),
            Text(strings.waitingOnDesk, style: context.texts.bodySmall),
          ],

          // The reason, verbatim. It is the whole point of telling them.
          if (payment.reviewNote != null) ...[
            const SizedBox(height: Gap.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: brand.muted,
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Text(
                payment.reviewNote!,
                style: context.texts.bodySmall,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
