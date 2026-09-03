import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/article.dart';
import '../../data/models/payment.dart';
import '../../data/models/vendor.dart';
import '../../data/repositories/payment_repository.dart';
import '../../data/repositories/photo_repository.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/preferences.dart';
import '../../state/vendors.dart';
import '../common/app_image.dart';

/// Paying, when there is no gateway.
///
/// The screen is shaped by that. A gateway would take the money and tell us;
/// here the payer leaves for their bank app and comes back to tell us — so the
/// two things that matter are that they carry the reference out with them, and
/// that they can prove what they did when they return.
///
/// The reference is generated once in [initState] and held. Rebuilding it would
/// hand somebody a code that no longer matches the one they just typed into
/// their bank.
class PayPage extends ConsumerStatefulWidget {
  const PayPage({
    super.key,
    required this.plan,
    required this.purpose,
    this.vendorId = '',
    this.vendorName = '',
    this.vendorCategory,
  });

  final VendorPlan plan;
  final PaymentPurpose purpose;
  final String vendorId;
  final String vendorName;
  final VendorCategory? vendorCategory;

  @override
  ConsumerState<PayPage> createState() => _PayPageState();
}

class _PayPageState extends ConsumerState<PayPage> {
  late final String _reference = PaymentRepository.newReference();
  final _utr = TextEditingController();
  final _phone = TextEditingController();

  ArticleImage? _proof;
  bool _uploading = false;
  bool _sending = false;

  @override
  void dispose() {
    _utr.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _payWith(UpiId upi, PaymentSettings settings) async {
    final intent = PaymentRepository.upiIntent(
      vpa: upi.vpa,
      payeeName: settings.payeeName,
      amountInPaise: widget.plan.priceInPaise,
      reference: _reference,
    );

    // A UPI intent has no handler on a device with no bank app, and
    // `launchUrl` throws rather than returning false for an unknown scheme.
    try {
      final opened = await launchUrl(
        intent,
        mode: LaunchMode.externalApplication,
      );
      if (!opened) throw Exception('no handler');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ref
                .read(stringsProvider)
                .pick(
                  'No UPI app opened. Copy the id and pay from your bank app.',
                  'UPI செயலி திறக்கவில்லை. எண்ணை நகலெடுத்துச் செலுத்துங்கள்.',
                ),
          ),
        ),
      );
    }
  }

  Future<void> _pickProof() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (picked == null) return;

    final uid = ref.read(currentUidProvider);
    if (uid == null) return;

    setState(() => _uploading = true);
    try {
      final image = await ref
          .read(photoRepositoryProvider)
          .upload(
            file: File(picked.path),
            uid: uid,
            bucket: PhotoBucket.paymentProof,
          );
      if (mounted) setState(() => _proof = image);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              ref
                  .read(stringsProvider)
                  .pick('That image would not upload.', 'படத்தை இணைக்க முடியவில்லை.'),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _send() async {
    final uid = ref.read(currentUidProvider);
    if (uid == null) return;
    final strings = ref.read(stringsProvider);

    setState(() => _sending = true);
    try {
      await ref
          .read(paymentRepositoryProvider)
          .submit(
            uid: uid,
            reference: _reference,
            purpose: widget.purpose,
            plan: widget.plan,
            utr: _utr.text,
            proof: _proof,
            vendorId: widget.vendorId,
            vendorName: widget.vendorName,
            vendorCategory: widget.vendorCategory,
            userPhone: _phone.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.paymentSent)));
      Navigator.of(context).pop();
    } on DuplicateUtrException {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.duplicateUtr)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(strings.pick('That did not send.', 'அனுப்ப முடியவில்லை.'))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final settings = ref.watch(paymentSettingsProvider);
    final brand = context.brand;
    final rupees = (widget.plan.priceInPaise / 100).round();

    return Scaffold(
      appBar: AppBar(title: Text(strings.payNow)),
      body: switch (settings) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncData(:final value) when !value.canPay => Center(
          child: Padding(
            padding: const EdgeInsets.all(Gap.xl),
            child: Text(
              strings.paymentsClosed,
              textAlign: TextAlign.center,
              style: context.texts.bodyLarge,
            ),
          ),
        ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.lg,
            Gap.page,
            Gap.xxl,
          ),
          children: [
            Text(
              '${widget.plan.name} · ₹$rupees',
              style: context.texts.titleLarge,
            ),
            Text(
              '${widget.plan.months} '
              '${strings.pick(widget.plan.months == 1 ? "month" : "months", "மாதம்")}'
              '${widget.vendorName.isEmpty ? "" : " · ${widget.vendorName}"}',
              style: context.texts.bodySmall,
            ),

            const SizedBox(height: Gap.lg),

            // The reference leads, ahead of any account number: it is the only
            // thing the payer has to carry into their bank app.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Gap.lg),
              decoration: BoxDecoration(
                color: brand.muted,
                borderRadius: BorderRadius.circular(Radii.lg),
                border: Border.all(color: brand.border),
              ),
              child: Column(
                children: [
                  Text(strings.putThisInTheNote, style: context.texts.bodySmall),
                  const SizedBox(height: Gap.sm),
                  Text(
                    _reference,
                    style: context.texts.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: _reference));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(strings.pick('Copied', 'நகலெடுக்கப்பட்டது')),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy, size: 16),
                    label: Text(strings.pick('Copy', 'நகலெடு')),
                  ),
                ],
              ),
            ),

            const SizedBox(height: Gap.lg),
            for (final upi in value.upiIds) ...[
              FilledButton.icon(
                onPressed: () => _payWith(upi, value),
                icon: const Icon(Icons.account_balance_outlined),
                label: Text('${strings.openUpiApp} · ${upi.vpa}'),
              ),
              const SizedBox(height: Gap.sm),
            ],

            if (value.qrImage != null) ...[
              const SizedBox(height: Gap.md),
              Center(
                child: SizedBox(
                  width: 220,
                  height: 220,
                  child: AppImage(url: value.qrImage!.url, fit: BoxFit.contain),
                ),
              ),
            ],

            if (strings
                .pick(value.instructions, value.instructionsTa)
                .isNotEmpty) ...[
              const SizedBox(height: Gap.md),
              Text(
                strings.pick(value.instructions, value.instructionsTa),
                style: context.texts.bodySmall,
              ),
            ],

            const SizedBox(height: Gap.xl),
            Divider(color: brand.border),
            const SizedBox(height: Gap.md),

            Text(strings.afterYouPaid, style: context.texts.titleMedium),
            const SizedBox(height: 2),
            Text(strings.afterYouPaidBody, style: context.texts.bodySmall),

            const SizedBox(height: Gap.lg),
            TextField(
              controller: _utr,
              decoration: InputDecoration(
                labelText: strings.utrLabel,
                helperText: strings.utrHint,
                helperMaxLines: 3,
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: Gap.md),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: strings.phoneForDesk,
                border: const OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: Gap.md),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _uploading ? null : _pickProof,
                  icon: _uploading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.image_outlined),
                  label: Text(strings.screenshot),
                ),
                if (_proof != null) ...[
                  const SizedBox(width: Gap.md),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(Radii.sm),
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: AppImage(url: _proof!.url, fit: BoxFit.cover),
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: Gap.xl),
            FilledButton(
              // Six characters is the shortest UTR an Indian bank issues, and
              // the rules refuse anything shorter anyway.
              onPressed: _sending || _utr.text.trim().length < 6 || _uploading
                  ? null
                  : _send,
              child: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(strings.sendToDesk),
            ),
          ],
        ),
        AsyncError() => Center(child: Text(strings.paymentsClosed)),
      },
    );
  }
}
