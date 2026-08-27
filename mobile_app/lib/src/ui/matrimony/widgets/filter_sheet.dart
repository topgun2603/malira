import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/matrimony.dart';
import '../../../data/repositories/matrimony_repository.dart';
import '../../../state/matrimony.dart';
import '../../../state/preferences.dart';

/// The browse filters.
///
/// Edited on a local copy and applied on dismissal, not live. A family narrows
/// several things at once — gender, then age, then diet — and re-running the
/// query after every tap would make the list jump under them mid-thought.
Future<void> showMatrimonyFilterSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _FilterSheet(),
  );
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet();

  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  late MatrimonyFilters _draft = ref.read(matrimonyFiltersProvider);
  late final TextEditingController _hometown = TextEditingController(
    text: _draft.hometown,
  );

  /// The band the age sliders move within. Below 18 is not a marriage age in
  /// India, so the control does not offer it.
  static const _minAge = 18.0;
  static const _maxAge = 60.0;

  @override
  void dispose() {
    _hometown.dispose();
    super.dispose();
  }

  void _apply() {
    ref
        .read(matrimonyFiltersProvider.notifier)
        .set(_draft.copyWith(hometown: _hometown.text));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    final range = RangeValues(
      (_draft.minAge ?? _minAge.toInt()).toDouble().clamp(_minAge, _maxAge),
      (_draft.maxAge ?? _maxAge.toInt()).toDouble().clamp(_minAge, _maxAge),
    );

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: Gap.page,
          right: Gap.page,
          bottom: MediaQuery.viewInsetsOf(context).bottom + Gap.lg,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      strings.filters,
                      style: context.texts.titleLarge,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() => _draft = const MatrimonyFilters());
                      _hometown.clear();
                    },
                    child: Text(strings.clearFilters),
                  ),
                ],
              ),

              const SizedBox(height: Gap.md),
              _Label(text: strings.isTamil ? 'யாரைத் தேடுகிறீர்கள்' : 'Looking for'),
              Wrap(
                spacing: Gap.sm,
                children: [
                  _Choice(
                    label: strings.anyGender,
                    selected: _draft.gender == null,
                    onTap: () =>
                        setState(() => _draft = _draft.copyWith(gender: null)),
                  ),
                  for (final gender in Gender.values)
                    _Choice(
                      label: strings.pick(gender.label, gender.labelTa),
                      selected: _draft.gender == gender,
                      onTap: () => setState(
                        () => _draft = _draft.copyWith(gender: gender),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: Gap.lg),
              _Label(
                text: '${strings.age}  ${range.start.round()}–${range.end.round()}',
              ),
              RangeSlider(
                values: range,
                min: _minAge,
                max: _maxAge,
                divisions: (_maxAge - _minAge).toInt(),
                labels: RangeLabels(
                  '${range.start.round()}',
                  '${range.end.round()}',
                ),
                onChanged: (values) => setState(() {
                  _draft = _draft.copyWith(
                    minAge: values.start.round(),
                    maxAge: values.end.round(),
                  );
                }),
              ),

              const SizedBox(height: Gap.sm),
              _Label(text: strings.maritalStatus),
              Wrap(
                spacing: Gap.sm,
                runSpacing: Gap.sm,
                children: [
                  _Choice(
                    label: strings.anyGender,
                    selected: _draft.maritalStatus == null,
                    onTap: () => setState(
                      () => _draft = _draft.copyWith(maritalStatus: null),
                    ),
                  ),
                  for (final status in MaritalStatus.values)
                    _Choice(
                      label: strings.pick(status.label, status.labelTa),
                      selected: _draft.maritalStatus == status,
                      onTap: () => setState(
                        () => _draft = _draft.copyWith(maritalStatus: status),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: Gap.lg),
              _Label(text: strings.diet),
              Wrap(
                spacing: Gap.sm,
                runSpacing: Gap.sm,
                children: [
                  _Choice(
                    label: strings.anyGender,
                    selected: _draft.diet == null,
                    onTap: () =>
                        setState(() => _draft = _draft.copyWith(diet: null)),
                  ),
                  for (final diet in Diet.values)
                    _Choice(
                      label: strings.pick(diet.label, diet.labelTa),
                      selected: _draft.diet == diet,
                      onTap: () =>
                          setState(() => _draft = _draft.copyWith(diet: diet)),
                    ),
                ],
              ),

              const SizedBox(height: Gap.lg),
              _Label(text: strings.hometown),
              TextField(
                controller: _hometown,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _apply(),
                style: context.texts.bodyLarge,
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: brand.muted,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: Gap.md,
                    vertical: Gap.md,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Radii.md),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),

              const SizedBox(height: Gap.xl),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _apply,
                  child: Text(strings.apply),
                ),
              ),
            ],
          ),
        ),
      ),
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

class _Choice extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final brand = context.brand;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : brand.muted,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: context.texts.labelMedium?.copyWith(
            color: selected ? scheme.onPrimary : brand.mutedForeground,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
