import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/matrimony.dart';
import '../../data/repositories/matrimony_repository.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/preferences.dart';
import 'widgets/horoscope_upload.dart';
import 'widgets/photo_picker.dart';

/// Create or edit the member's own listing.
///
/// Saving always returns the profile to `pending` — a member cannot approve
/// their own listing, and one edited after approval has not been reviewed in
/// the form it is now in. The form says so before they tap, rather than letting
/// them discover it when their live profile disappears.
class EditMatrimonyProfilePage extends ConsumerWidget {
  const EditMatrimonyProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionTheme.matrimony(
      context: context,
      child: const _EditForm(),
    );
  }
}

class _EditForm extends ConsumerStatefulWidget {
  const _EditForm();

  @override
  ConsumerState<_EditForm> createState() => _EditFormState();
}

class _EditFormState extends ConsumerState<_EditForm> {
  final _formKey = GlobalKey<FormState>();

  ProfileDraft _draft = const ProfileDraft();
  bool _loaded = false;
  bool _saving = false;
  String? _error;

  final _controllers = <String, TextEditingController>{};

  TextEditingController _controller(String key, String initial) {
    return _controllers.putIfAbsent(
      key,
      () => TextEditingController(text: initial),
    );
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  /// Fills the form from the existing listing, once.
  Future<void> _loadOnce() async {
    if (_loaded) return;
    _loaded = true;

    final uid = ref.read(currentUidProvider);
    if (uid == null) return;

    final repository = ref.read(matrimonyRepositoryProvider);
    final profile = await repository.profile(uid);
    if (profile == null || !mounted) return;

    final contact = await repository.contact(uid);
    if (!mounted) return;

    setState(() => _draft = ProfileDraft.from(profile, contact));
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial =
        _draft.dob ?? DateTime(now.year - 25, now.month, now.day);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      // The window is the marriageable range, so the picker cannot be used to
      // enter a date that the save would then reject.
      firstDate: DateTime(now.year - 80),
      lastDate: DateTime(now.year - 18, now.month, now.day),
      helpText: ref.read(stringsProvider).dateOfBirth,
    );

    if (picked != null) setState(() => _draft = _draft.copyWith(dob: picked));
  }

  /// Returns a reader-facing message when the draft cannot be saved.
  ///
  /// Mirrors `validateProfile` in the web API, including the age rule. That one
  /// is law rather than preference: below 21 for a man or 18 for a woman, the
  /// listing is not merely unwise, it is illegal to publish in India.
  String? _validate(Strings strings) {
    if (_draft.name.trim().isEmpty) {
      return strings.isTamil ? 'பெயர் தேவை.' : 'A name is required.';
    }
    if (_draft.dob == null) {
      return strings.isTamil
          ? 'பிறந்த தேதி தேவை.'
          : 'A date of birth is required.';
    }
    if (_draft.phone.trim().isEmpty) {
      return strings.isTamil
          ? 'தொடர்பு எண் தேவை.'
          : 'A contact number is required.';
    }

    final age = _draft.age;
    if (age == null || age < _draft.gender.minimumAge) {
      return strings.minimumAgeBlocked;
    }
    if (age > 100) {
      return strings.isTamil
          ? 'பிறந்த தேதியைச் சரிபார்க்கவும்.'
          : 'Check the date of birth.';
    }
    return null;
  }

  Future<void> _save() async {
    final strings = ref.read(stringsProvider);
    final problem = _validate(strings);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }

    final uid = ref.read(currentUidProvider);
    if (uid == null) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(matrimonyRepositoryProvider).saveProfile(uid, _draft);
      if (!mounted) return;
      messenger.showSnackBar(
        SnackBar(content: Text(strings.profilePending)),
      );
      context.pop();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = strings.isTamil
              ? 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
              : 'Could not save. Please try again.';
        });
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    _loadOnce();

    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.myProfile, style: context.texts.titleLarge),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.lg,
            Gap.page,
            Gap.xxl,
          ),
          children: [
            Container(
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: brand.saffron.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, size: 18, color: brand.saffron),
                  const SizedBox(width: Gap.sm),
                  Expanded(
                    child: Text(
                      strings.editReturnsToQueue,
                      style: context.texts.bodySmall?.copyWith(
                        color: brand.saffron,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: Gap.xl),
            _Label(text: strings.postedBy),
            _ChoiceRow<PostedBy>(
              values: PostedBy.values,
              selected: _draft.postedBy,
              label: (value) => strings.pick(value.label, value.labelTa),
              onSelect: (value) =>
                  setState(() => _draft = _draft.copyWith(postedBy: value)),
            ),

            const SizedBox(height: Gap.lg),
            _Text(
              controller: _controller('name', _draft.name),
              label: strings.yourName,
              onChanged: (value) => _draft = _draft.copyWith(name: value),
            ),

            const SizedBox(height: Gap.lg),
            _Label(text: strings.isTamil ? 'பாலினம்' : 'Gender'),
            _ChoiceRow<Gender>(
              values: Gender.values,
              selected: _draft.gender,
              label: (value) => strings.pick(value.label, value.labelTa),
              onSelect: (value) =>
                  setState(() => _draft = _draft.copyWith(gender: value)),
            ),

            const SizedBox(height: Gap.lg),
            _Label(text: strings.dateOfBirth),
            InkWell(
              onTap: _pickDob,
              borderRadius: BorderRadius.circular(Radii.md),
              child: Container(
                padding: const EdgeInsets.all(Gap.md),
                decoration: BoxDecoration(
                  color: brand.muted,
                  borderRadius: BorderRadius.circular(Radii.md),
                  border: Border.all(color: brand.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 18,
                      color: brand.mutedForeground,
                    ),
                    const SizedBox(width: Gap.md),
                    Text(
                      _draft.dob == null
                          ? (strings.isTamil ? 'தேர்ந்தெடுக்கவும்' : 'Choose')
                          : Dates.short(_draft.dob),
                      style: context.texts.bodyLarge,
                    ),
                    if (_draft.age != null) ...[
                      const Spacer(),
                      Text(
                        '${_draft.age} ${strings.age.toLowerCase()}',
                        style: context.texts.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: Gap.lg),
            _Text(
              controller: _controller(
                'height',
                _draft.heightCm == 0 ? '' : '${_draft.heightCm}',
              ),
              label: '${strings.height} (cm)',
              keyboardType: TextInputType.number,
              onChanged: (value) => _draft = _draft.copyWith(
                heightCm: int.tryParse(value) ?? 0,
              ),
            ),

            const SizedBox(height: Gap.lg),
            _Label(text: strings.maritalStatus),
            _ChoiceRow<MaritalStatus>(
              values: MaritalStatus.values,
              selected: _draft.maritalStatus,
              label: (value) => strings.pick(value.label, value.labelTa),
              onSelect: (value) => setState(
                () => _draft = _draft.copyWith(maritalStatus: value),
              ),
            ),

            const SizedBox(height: Gap.lg),
            _Label(text: strings.diet),
            _ChoiceRow<Diet>(
              values: Diet.values,
              selected: _draft.diet,
              label: (value) => strings.pick(value.label, value.labelTa),
              onSelect: (value) =>
                  setState(() => _draft = _draft.copyWith(diet: value)),
            ),

            const SizedBox(height: Gap.xl),
            _GroupHeading(text: strings.isTamil ? 'விவரங்கள்' : 'Details'),
            _Text(
              controller: _controller('education', _draft.education),
              label: strings.education,
              onChanged: (value) => _draft = _draft.copyWith(education: value),
            ),
            _Text(
              controller: _controller('occupation', _draft.occupation),
              label: strings.occupation,
              onChanged: (value) => _draft = _draft.copyWith(occupation: value),
            ),
            _Text(
              controller: _controller('workLocation', _draft.workLocation),
              label: strings.workLocation,
              onChanged: (value) =>
                  _draft = _draft.copyWith(workLocation: value),
            ),
            _Text(
              controller: _controller('hometown', _draft.hometown),
              label: strings.hometown,
              onChanged: (value) => _draft = _draft.copyWith(hometown: value),
            ),
            _Text(
              controller: _controller('motherTongue', _draft.motherTongue),
              label: strings.motherTongue,
              onChanged: (value) =>
                  _draft = _draft.copyWith(motherTongue: value),
            ),
            _Text(
              controller: _controller('about', _draft.about),
              label: strings.aboutPerson,
              maxLines: 4,
              onChanged: (value) => _draft = _draft.copyWith(about: value),
            ),

            const SizedBox(height: Gap.lg),
            _GroupHeading(text: strings.birthDetails),
            _Text(
              controller: _controller('birthTime', _draft.birthTime),
              label: strings.birthTime,
              onChanged: (value) => _draft = _draft.copyWith(birthTime: value),
            ),
            _Text(
              controller: _controller('birthPlace', _draft.birthPlace),
              label: strings.birthPlace,
              onChanged: (value) => _draft = _draft.copyWith(birthPlace: value),
            ),

            const SizedBox(height: Gap.lg),
            _GroupHeading(text: strings.family),
            _Text(
              controller: _controller(
                'fatherOccupation',
                _draft.fatherOccupation,
              ),
              label: strings.fatherOccupation,
              onChanged: (value) =>
                  _draft = _draft.copyWith(fatherOccupation: value),
            ),
            _Text(
              controller: _controller(
                'motherOccupation',
                _draft.motherOccupation,
              ),
              label: strings.motherOccupation,
              onChanged: (value) =>
                  _draft = _draft.copyWith(motherOccupation: value),
            ),
            _Text(
              controller: _controller('siblings', _draft.siblings),
              label: strings.siblings,
              onChanged: (value) => _draft = _draft.copyWith(siblings: value),
            ),

            const SizedBox(height: Gap.lg),
            _GroupHeading(text: strings.photographs),
            MatrimonyPhotoPicker(
              photos: _draft.photos,
              onChanged: (photos) =>
                  setState(() => _draft = _draft.copyWith(photos: photos)),
            ),

            const SizedBox(height: Gap.lg),
            _Label(text: strings.photoPrivacy),
            _ChoiceRow<PhotoVisibility>(
              values: PhotoVisibility.values,
              selected: _draft.photoVisibility,
              label: (value) => strings.pick(value.label, value.labelTa),
              onSelect: (value) => setState(
                () => _draft = _draft.copyWith(photoVisibility: value),
              ),
            ),

            const SizedBox(height: Gap.lg),
            _GroupHeading(text: strings.contactDetails),
            // Said plainly next to the fields that hold it, not buried in a
            // policy page: this is the moment somebody decides whether to
            // enter their number.
            Text(strings.contactLocked, style: context.texts.bodySmall),
            const SizedBox(height: Gap.md),
            _Text(
              controller: _controller('phone', _draft.phone),
              label: strings.phone,
              keyboardType: TextInputType.phone,
              onChanged: (value) => _draft = _draft.copyWith(phone: value),
            ),
            _Text(
              controller: _controller('email', _draft.email),
              label: strings.email,
              keyboardType: TextInputType.emailAddress,
              onChanged: (value) => _draft = _draft.copyWith(email: value),
            ),
            _Text(
              controller: _controller('horoscope', _draft.horoscopeNote),
              label: strings.horoscope,
              maxLines: 3,
              onChanged: (value) =>
                  _draft = _draft.copyWith(horoscopeNote: value),
            ),

            const SizedBox(height: Gap.sm),
            HoroscopeUpload(
              image: _draft.horoscopeImage,
              onChanged: (image) => setState(
                () => _draft = _draft.copyWith(horoscopeImage: image),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: Gap.md),
              Container(
                padding: const EdgeInsets.all(Gap.md),
                decoration: BoxDecoration(
                  color: context.scheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(Radii.md),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 18,
                      color: context.scheme.error,
                    ),
                    const SizedBox(width: Gap.sm),
                    Expanded(
                      child: Text(
                        _error!,
                        style: context.texts.bodyMedium?.copyWith(
                          color: context.scheme.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: Gap.xl),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Text(strings.saveForReview),
            ),
          ],
        ),
      ),
    );
  }
}

class _Text extends StatelessWidget {
  const _Text({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.keyboardType,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String label;
  final ValueChanged<String> onChanged;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.md),
      child: TextFormField(
        controller: controller,
        onChanged: onChanged,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: context.texts.bodyLarge,
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: context.brand.muted,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radii.md),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radii.md),
            borderSide: BorderSide(color: context.brand.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radii.md),
            borderSide: BorderSide(color: context.scheme.primary, width: 1.6),
          ),
        ),
      ),
    );
  }
}

class _ChoiceRow<T> extends StatelessWidget {
  const _ChoiceRow({
    required this.values,
    required this.selected,
    required this.label,
    required this.onSelect,
  });

  final List<T> values;
  final T selected;
  final String Function(T) label;
  final ValueChanged<T> onSelect;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: Gap.sm,
      runSpacing: Gap.sm,
      children: [
        for (final value in values)
          GestureDetector(
            onTap: () => onSelect(value),
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 9,
              ),
              decoration: BoxDecoration(
                color: value == selected
                    ? context.scheme.primary
                    : context.brand.muted,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                label(value),
                style: context.texts.labelMedium?.copyWith(
                  color: value == selected
                      ? context.scheme.onPrimary
                      : context.brand.mutedForeground,
                  fontWeight: value == selected
                      ? FontWeight.w600
                      : FontWeight.w500,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Label extends StatelessWidget {
  const _Label({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Text(
        text.toUpperCase(),
        style: context.texts.labelSmall?.copyWith(
          color: context.brand.mutedForeground,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _GroupHeading extends StatelessWidget {
  const _GroupHeading({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.md),
      child: Text(text, style: context.texts.titleMedium),
    );
  }
}
