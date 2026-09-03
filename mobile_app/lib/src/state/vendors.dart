import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/payment.dart';
import '../data/models/vendor.dart';
import '../data/repositories/payment_repository.dart';
import '../data/repositories/vendor_repository.dart';
import 'auth.dart';
import 'providers.dart';

final vendorRepositoryProvider = Provider<VendorRepository>(
  (ref) => VendorRepository(ref.watch(refsProvider)),
);

final paymentRepositoryProvider = Provider<PaymentRepository>(
  (ref) => PaymentRepository(ref.watch(refsProvider)),
);

/// What the directory is being filtered by right now.
class VendorFilters {
  const VendorFilters({this.category, this.town = '', this.term = ''});

  final VendorCategory? category;
  final String town;
  final String term;

  VendorFilters copyWith({
    Object? category = _unset,
    String? town,
    String? term,
  }) => VendorFilters(
    category: category == _unset ? this.category : category as VendorCategory?,
    town: town ?? this.town,
    term: term ?? this.term,
  );

  bool get isEmpty => category == null && town.isEmpty && term.isEmpty;

  /// A sentinel, because `null` is a meaningful value for [category] — passing
  /// it has to mean "every category" rather than "leave it alone".
  static const _unset = Object();
}

class VendorFilterNotifier extends Notifier<VendorFilters> {
  @override
  VendorFilters build() => const VendorFilters();

  void setCategory(VendorCategory? value) =>
      state = state.copyWith(category: value);
  void setTown(String value) => state = state.copyWith(town: value);
  void setTerm(String value) => state = state.copyWith(term: value);
  void clear() => state = const VendorFilters();
}

final vendorFiltersProvider =
    NotifierProvider<VendorFilterNotifier, VendorFilters>(
      VendorFilterNotifier.new,
    );

/// The public directory. No account required — that is the point of it.
final vendorSearchProvider = FutureProvider<List<Vendor>>((ref) {
  final filters = ref.watch(vendorFiltersProvider);
  return ref
      .watch(vendorRepositoryProvider)
      .search(
        category: filters.category,
        town: filters.town,
        term: filters.term,
      );
});

final vendorProvider = StreamProvider.autoDispose.family<Vendor?, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).watch(id),
);

/// Everything this account manages, live or not.
final ownVendorsProvider = StreamProvider<List<Vendor>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const []);
  return ref.watch(vendorRepositoryProvider).watchOwn(uid);
});

/* -------------------------------------------------------------------------- */
/*  Payments                                                                   */
/* -------------------------------------------------------------------------- */

final paymentSettingsProvider = FutureProvider<PaymentSettings>(
  (ref) => ref.watch(paymentRepositoryProvider).settings(),
);

/// Plans for one half of the product. `matrimony` or `vendor`.
final plansProvider = FutureProvider.family<List<VendorPlan>, String>(
  (ref, kind) => ref.watch(paymentRepositoryProvider).plans(kind),
);

final ownPaymentsProvider = StreamProvider<List<PaymentRequest>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const []);
  return ref.watch(paymentRepositoryProvider).watchOwn(uid);
});

final noticesProvider = StreamProvider<List<UserNotice>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const []);
  return ref.watch(paymentRepositoryProvider).watchNotices(uid);
});

/// How many notices are waiting, for the badge on the More tab.
final unreadNoticesProvider = Provider<int>(
  (ref) =>
      (ref.watch(noticesProvider).value ?? const [])
          .where((notice) => !notice.read)
          .length,
);
