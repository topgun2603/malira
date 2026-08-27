import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/article.dart';
import '../../../data/repositories/photo_repository.dart';
import '../../../state/auth.dart';
import '../../../state/matrimony.dart';
import '../../../state/preferences.dart';
import '../../common/app_image.dart';

/// Uploads a photograph of the jathagam.
///
/// One image, not a gallery: families hand over a single sheet, and a horoscope
/// is compared rather than browsed. It goes to the same `matrimony/{uid}/`
/// folder as the photographs and is written into the private contact document,
/// so it is released on the same terms as the phone number — which matters more
/// here, because a jathagam carries a birth date, a birth time and a birth
/// place on one page.
class HoroscopeUpload extends ConsumerStatefulWidget {
  const HoroscopeUpload({
    super.key,
    required this.image,
    required this.onChanged,
  });

  final ArticleImage? image;
  final ValueChanged<ArticleImage?> onChanged;

  @override
  ConsumerState<HoroscopeUpload> createState() => _HoroscopeUploadState();
}

class _HoroscopeUploadState extends ConsumerState<HoroscopeUpload> {
  final _picker = ImagePicker();
  double? _progress;
  String? _error;

  Future<void> _pick(ImageSource source) async {
    final strings = ref.read(stringsProvider);
    final uid = ref.read(currentUidProvider);
    if (uid == null) return;

    final XFile? picked;
    try {
      picked = await _picker.pickImage(source: source, maxWidth: 2400);
    } catch (_) {
      setState(() => _error = strings.photoPickFailed);
      return;
    }
    if (picked == null) return;

    setState(() {
      _progress = 0;
      _error = null;
    });

    try {
      final uploaded = await ref
          .read(photoRepositoryProvider)
          .upload(
            file: File(picked.path),
            uid: uid,
            onProgress: (value) {
              if (mounted) setState(() => _progress = value);
            },
          );
      if (!mounted) return;

      // Replacing: the old sheet is of no use to anyone once a new one is up,
      // and leaving it in the bucket means a horoscope nobody can reach and
      // nobody deleted.
      final previous = widget.image;
      widget.onChanged(uploaded);
      if (previous != null) {
        await ref.read(photoRepositoryProvider).delete(previous);
      }
    } on PhotoFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) setState(() => _error = strings.photoUploadFailed);
    } finally {
      if (mounted) setState(() => _progress = null);
    }
  }

  Future<void> _remove() async {
    final image = widget.image;
    widget.onChanged(null);
    if (image != null) {
      await ref.read(photoRepositoryProvider).delete(image);
    }
  }

  Future<void> _sheet() async {
    final strings = ref.read(stringsProvider);
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: Text(strings.chooseFromGallery),
              onTap: () {
                Navigator.of(context).pop();
                _pick(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: Text(strings.takePhoto),
              onTap: () {
                Navigator.of(context).pop();
                _pick(ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;
    final image = widget.image;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(strings.horoscopeSheet, style: context.texts.titleMedium),
        const SizedBox(height: 4),
        Text(strings.horoscopeHint, style: context.texts.bodySmall),
        const SizedBox(height: Gap.md),

        if (_progress != null)
          Container(
            height: 132,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: brand.muted,
              borderRadius: BorderRadius.circular(Radii.md),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 28,
                  width: 28,
                  child: CircularProgressIndicator(
                    value: _progress! > 0 ? _progress : null,
                    strokeWidth: 2.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${(_progress! * 100).round()}%',
                  style: context.texts.labelSmall,
                ),
              ],
            ),
          )
        else if (image != null)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppImage(
                url: image.url,
                height: 132,
                width: 100,
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.lock_outline,
                          size: 15,
                          color: brand.mutedForeground,
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            strings.horoscopePrivate,
                            style: context.texts.bodySmall,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Gap.sm),
                    OutlinedButton.icon(
                      onPressed: _sheet,
                      icon: const Icon(Icons.autorenew, size: 16),
                      label: Text(strings.replaceSheet),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 38),
                        textStyle: context.texts.labelMedium,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _remove,
                      icon: Icon(
                        Icons.delete_outline,
                        size: 16,
                        color: context.scheme.error,
                      ),
                      label: Text(
                        strings.removed,
                        style: TextStyle(color: context.scheme.error),
                      ),
                      style: TextButton.styleFrom(
                        minimumSize: const Size(0, 34),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          )
        else
          GestureDetector(
            onTap: _sheet,
            behavior: HitTestBehavior.opaque,
            child: Container(
              height: 108,
              width: double.infinity,
              decoration: BoxDecoration(
                color: context.scheme.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(Radii.md),
                border: Border.all(
                  color: context.scheme.primary.withValues(alpha: 0.35),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.auto_stories_outlined,
                    size: 24,
                    color: context.scheme.primary,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    strings.uploadHoroscope,
                    style: context.texts.labelLarge?.copyWith(
                      color: context.scheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),

        if (_error != null) ...[
          const SizedBox(height: Gap.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.error_outline,
                size: 16,
                color: context.scheme.error,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _error!,
                  style: context.texts.bodySmall?.copyWith(
                    color: context.scheme.error,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Copy for this one screen, kept beside it.
extension HoroscopeStrings on Strings {
  String get horoscopeSheet => isTamil ? 'ஜாதகம்' : 'Horoscope';
  String get uploadHoroscope =>
      isTamil ? 'ஜாதகத்தைப் பதிவேற்று' : 'Upload horoscope';
  String get replaceSheet => isTamil ? 'மாற்று' : 'Replace';
  String get horoscopeHint => isTamil
      ? 'ஜாதகத்தை புகைப்படம் எடுத்து இணைக்கலாம். ஒரு படம் மட்டும்.'
      : 'Photograph the jathagam sheet and attach it. One image.';
  String get horoscopePrivate => isTamil
      ? 'விருப்பம் ஏற்கப்பட்ட பிறகே இது தெரியும்.'
      : 'Shown only after an interest is accepted.';
}
