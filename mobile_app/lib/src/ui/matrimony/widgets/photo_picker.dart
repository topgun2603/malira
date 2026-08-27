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

/// The photograph strip on the profile form.
///
/// Uploads as soon as a photo is chosen rather than deferring to Save. A
/// member on a hill connection needs to see each one land, and a form that
/// uploads five photographs at the moment they tap Save is a form that appears
/// to hang and then fails all-or-nothing.
///
/// The consequence is stated in the code below rather than hidden: a photo
/// uploaded and then abandoned without saving is already in Storage. Removing
/// one deletes the object immediately, so the only leak is an abandoned form,
/// which is a far better trade than a save that can half-succeed.
class MatrimonyPhotoPicker extends ConsumerStatefulWidget {
  const MatrimonyPhotoPicker({
    super.key,
    required this.photos,
    required this.onChanged,
  });

  final List<ArticleImage> photos;
  final ValueChanged<List<ArticleImage>> onChanged;

  @override
  ConsumerState<MatrimonyPhotoPicker> createState() =>
      _MatrimonyPhotoPickerState();
}

class _MatrimonyPhotoPickerState extends ConsumerState<MatrimonyPhotoPicker> {
  final _picker = ImagePicker();

  /// Filenames currently uploading, with their progress.
  final _inFlight = <String, double>{};
  String? _error;

  int get _remaining => PhotoRepository.maxPhotos - widget.photos.length;

  Future<void> _add({required ImageSource source}) async {
    final strings = ref.read(stringsProvider);
    final uid = ref.read(currentUidProvider);
    if (uid == null || _remaining <= 0) return;

    final List<XFile> picked;
    try {
      if (source == ImageSource.camera) {
        final shot = await _picker.pickImage(
          source: ImageSource.camera,
          // Cheap first pass; the repository still compresses properly.
          maxWidth: 2400,
        );
        picked = shot == null ? const [] : [shot];
      } else {
        // Multi-select, capped at what is still free so somebody cannot pick
        // eight and have three silently dropped.
        final images = await _picker.pickMultiImage(limit: _remaining);
        picked = images.take(_remaining).toList();
      }
    } catch (_) {
      setState(() => _error = strings.photoPickFailed);
      return;
    }

    if (picked.isEmpty) return;
    setState(() => _error = null);

    final repository = ref.read(photoRepositoryProvider);

    for (final file in picked) {
      setState(() => _inFlight[file.path] = 0);
      try {
        final uploaded = await repository.upload(
          file: File(file.path),
          uid: uid,
          onProgress: (value) {
            if (!mounted) return;
            setState(() => _inFlight[file.path] = value);
          },
        );
        if (!mounted) return;
        widget.onChanged([...widget.photos, uploaded]);
      } on PhotoFailure catch (failure) {
        if (mounted) setState(() => _error = failure.message);
      } catch (_) {
        if (mounted) setState(() => _error = strings.photoUploadFailed);
      } finally {
        if (mounted) setState(() => _inFlight.remove(file.path));
      }
    }
  }

  Future<void> _remove(ArticleImage photo) async {
    widget.onChanged(
      widget.photos.where((entry) => entry.url != photo.url).toList(),
    );
    // Deleted straight away rather than on save: a photograph the member has
    // taken back should leave the bucket at that moment, not when they next
    // happen to press a button.
    await ref.read(photoRepositoryProvider).delete(photo);
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
                _add(source: ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: Text(strings.takePhoto),
              onTap: () {
                Navigator.of(context).pop();
                _add(source: ImageSource.camera);
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
    final photos = widget.photos;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                strings.photographs,
                style: context.texts.titleMedium,
              ),
            ),
            Text(
              '${photos.length}/${PhotoRepository.maxPhotos}',
              style: context.texts.bodySmall,
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(strings.photoHint, style: context.texts.bodySmall),
        const SizedBox(height: Gap.md),

        SizedBox(
          height: 118,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (var index = 0; index < photos.length; index++)
                Padding(
                  padding: const EdgeInsets.only(right: Gap.sm),
                  child: _Thumb(
                    photo: photos[index],
                    // The first photograph is the one the browse card and the
                    // profile header use, so it is worth marking.
                    isLead: index == 0,
                    leadLabel: strings.mainPhoto,
                    onRemove: () => _remove(photos[index]),
                  ),
                ),

              for (final progress in _inFlight.values)
                Padding(
                  padding: const EdgeInsets.only(right: Gap.sm),
                  child: _Uploading(progress: progress),
                ),

              if (_remaining > 0 && _inFlight.isEmpty)
                _AddTile(label: strings.addPhoto, onTap: _sheet),
            ],
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

        const SizedBox(height: Gap.md),
        Container(
          padding: const EdgeInsets.all(Gap.md),
          decoration: BoxDecoration(
            color: brand.muted,
            borderRadius: BorderRadius.circular(Radii.md),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.privacy_tip_outlined,
                size: 17,
                color: brand.mutedForeground,
              ),
              const SizedBox(width: Gap.sm),
              Expanded(
                child: Text(
                  strings.photoStorageNote,
                  style: context.texts.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({
    required this.photo,
    required this.isLead,
    required this.leadLabel,
    required this.onRemove,
  });

  final ArticleImage photo;
  final bool isLead;
  final String leadLabel;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 94,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          AppImage(
            url: photo.url,
            height: 118,
            width: 94,
            borderRadius: BorderRadius.circular(Radii.md),
          ),
          if (isLead)
            Positioned(
              left: 5,
              bottom: 5,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.62),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  leadLabel,
                  style: context.texts.labelSmall?.copyWith(
                    color: Colors.white,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
          Positioned(
            top: -4,
            right: -4,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: context.scheme.error,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: context.scheme.surface,
                    width: 2,
                  ),
                ),
                child: const Icon(Icons.close, size: 13, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Uploading extends StatelessWidget {
  const _Uploading({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Container(
      height: 118,
      width: 94,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: brand.muted,
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            height: 26,
            width: 26,
            child: CircularProgressIndicator(
              // Indeterminate until the first byte lands, so the ring does not
              // sit frozen at zero while the image is being compressed.
              value: progress > 0 ? progress : null,
              strokeWidth: 2.4,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${(progress * 100).round()}%',
            style: context.texts.labelSmall?.copyWith(
              color: brand.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _AddTile extends StatelessWidget {
  const _AddTile({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        height: 118,
        width: 94,
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
              Icons.add_a_photo_outlined,
              size: 22,
              color: context.scheme.primary,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: context.texts.labelSmall?.copyWith(
                color: context.scheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Copy only the photo strip uses. Anything shared with the horoscope uploader
/// lives in [Strings] instead.
extension PhotoStrings on Strings {
  String get photographs => isTamil ? 'புகைப்படங்கள்' : 'Photographs';
  String get addPhoto => isTamil ? 'சேர்' : 'Add';
  String get mainPhoto => isTamil ? 'முதன்மை' : 'Main';
  String get photoHint => isTamil
      ? 'அதிகபட்சம் 5. முதல் படம் பட்டியலில் காட்டப்படும்.'
      : 'Up to five. The first one is shown on your listing.';
  String get photoStorageNote => isTamil
      ? 'நீங்கள் தேர்ந்தெடுத்த தனியுரிமை அமைப்பின்படி மட்டுமே புகைப்படங்கள் காட்டப்படும்.'
      : 'Photographs follow the privacy setting above. If you restrict them, '
            'they are stored separately and never sent to anyone who has not '
            'had an interest accepted.';
}
