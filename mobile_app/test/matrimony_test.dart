import 'package:flutter_test/flutter_test.dart';
import 'package:nilgiri_news/src/data/models/matrimony.dart';
import 'package:nilgiri_news/src/data/repositories/matrimony_repository.dart';

/// The matrimony rules that must not drift.
///
/// Two of these are not preferences. The minimum marriage age is Indian law,
/// and the contact-unlock test decides whether a phone number is shown to
/// somebody who has not earned it. Both are enforced server-side as well — the
/// point here is that the client agrees with the rules rather than discovering
/// the disagreement as a permission error in front of a user.
void main() {
  MatrimonyInterest interest({
    required String from,
    required String to,
    required InterestStatus status,
    DateTime? createdAt,
  }) {
    return MatrimonyInterest(
      id: MatrimonyInterest.idFor(from, to),
      fromUid: from,
      toUid: to,
      fromName: from,
      toName: to,
      status: status,
      createdAt: createdAt,
      respondedAt: null,
    );
  }

  group('legal minimum marriage age', () {
    test('India: 21 for a man, 18 for a woman', () {
      expect(Gender.male.minimumAge, 21);
      expect(Gender.female.minimumAge, 18);
    });

    test('a draft below the minimum is under-age for that gender', () {
      final now = DateTime.now();
      // Exactly 20 years old today.
      final twenty = DateTime(now.year - 20, now.month, now.day);

      final man = ProfileDraft(gender: Gender.male, dob: twenty);
      final woman = ProfileDraft(gender: Gender.female, dob: twenty);

      expect(man.age, 20);
      expect(man.age! < man.gender.minimumAge, isTrue, reason: '20 < 21');
      expect(woman.age! < woman.gender.minimumAge, isFalse, reason: '20 >= 18');
    });

    test('age does not round up before the birthday has come round', () {
      final now = DateTime.now();
      // A birthday one day away: still the younger age today.
      final almost = DateTime(now.year - 25, now.month, now.day)
          .add(const Duration(days: 1));
      final draft = ProfileDraft(dob: almost);
      expect(draft.age, 24);
    });
  });

  group('interest identity', () {
    test('the id is derived from both uids, in order', () {
      expect(MatrimonyInterest.idFor('alice', 'bob'), 'alice__bob');
      // Direction matters: this is what stops one account forging an interest
      // that appears to come from another.
      expect(
        MatrimonyInterest.idFor('bob', 'alice'),
        isNot(MatrimonyInterest.idFor('alice', 'bob')),
      );
    });

    test('the other party is resolved from either end', () {
      final sent = interest(
        from: 'alice',
        to: 'bob',
        status: InterestStatus.sent,
      );
      expect(sent.otherUid('alice'), 'bob');
      expect(sent.otherUid('bob'), 'alice');
      expect(sent.otherName('alice'), 'bob');
    });
  });

  group('contact unlock', () {
    test('an accepted interest unlocks in either direction', () {
      final accepted = [
        interest(from: 'alice', to: 'bob', status: InterestStatus.accepted),
      ];
      expect(isMatched(accepted, 'alice', 'bob'), isTrue);
      // Bob accepted Alice, so Alice has earned Bob's contact too.
      expect(isMatched(accepted, 'bob', 'alice'), isTrue);
    });

    test('anything short of accepted stays locked', () {
      for (final status in [
        InterestStatus.sent,
        InterestStatus.declined,
        InterestStatus.withdrawn,
      ]) {
        final interests = [
          interest(from: 'alice', to: 'bob', status: status),
        ];
        expect(
          isMatched(interests, 'alice', 'bob'),
          isFalse,
          reason: 'status ${status.id} must not unlock contact details',
        );
      }
    });

    test('an unrelated pair is never matched', () {
      final interests = [
        interest(from: 'alice', to: 'bob', status: InterestStatus.accepted),
      ];
      expect(isMatched(interests, 'alice', 'carol'), isFalse);
    });
  });

  group('free interest quota', () {
    test('counts only interests sent this calendar month', () {
      final now = DateTime.now();
      final thisMonth = DateTime(now.year, now.month, 1, 12);
      final lastMonth = DateTime(now.year, now.month, 1).subtract(
        const Duration(days: 2),
      );

      final sent = [
        interest(
          from: 'me',
          to: 'a',
          status: InterestStatus.sent,
          createdAt: thisMonth,
        ),
        interest(
          from: 'me',
          to: 'b',
          status: InterestStatus.sent,
          createdAt: lastMonth,
        ),
      ];

      const allowance = MatrimonyLimits.defaults;
      expect(interestsThisMonth(sent), 1);
      expect(
        remainingInterests(sent, false, allowance.freeInterestsPerMonth),
        allowance.freeInterestsPerMonth - 1,
      );
    });

    test('never reports a negative allowance', () {
      final now = DateTime.now();
      final sent = [
        for (var index = 0;
            index < MatrimonyLimits.defaults.freeInterestsPerMonth + 4;
            index++)
          interest(
            from: 'me',
            to: 'other$index',
            status: InterestStatus.sent,
            createdAt: DateTime(now.year, now.month, 2),
          ),
      ];
      expect(
        remainingInterests(
          sent,
          false,
          MatrimonyLimits.defaults.freeInterestsPerMonth,
        ),
        0,
      );
    });

    test('a held plan is unlimited, expressed as null', () {
      expect(remainingInterests(const [], true, 3), isNull);
    });

    test('the allowance comes from the association, not from a constant', () {
      // `settings/matrimony` is admin-edited; the app must use whatever it
      // says rather than a compiled-in 3.
      expect(remainingInterests(const [], false, 10), 10);
    });

    test('an interest with no timestamp is not counted against the month', () {
      // A write that has not round-tripped to the server yet has a null
      // createdAt locally. Counting it would charge somebody twice.
      final sent = [
        interest(from: 'me', to: 'a', status: InterestStatus.sent),
      ];
      expect(interestsThisMonth(sent), 0);
    });
  });

  group('subscription', () {
    test('premium that has run out is not premium', () {
      final expired = Subscription(
        planId: 'six-months',
        planName: 'Six months',
        status: 'active',
        expiresAt: DateTime.now().subtract(const Duration(days: 1)),
      );
      expect(expired.isPremium, isFalse);
    });

    test('premium with a future expiry counts', () {
      final live = Subscription(
        planId: 'six-months',
        planName: 'Six months',
        status: 'active',
        expiresAt: DateTime.now().add(const Duration(days: 30)),
      );
      expect(live.isPremium, isTrue);
    });

    test('no plan and a missing document are both non-premium', () {
      expect(Subscription.none.isPremium, isFalse);
      // A row with an expiry but no plan is not an entitlement.
      expect(
        Subscription(
          planId: null,
          planName: '',
          status: 'active',
          expiresAt: DateTime.now().add(const Duration(days: 30)),
        ).isPremium,
        isFalse,
      );
    });
  });

  group('free allowance defaults', () {
    test('match the web DEFAULT_MATRIMONY_LIMITS', () {
      expect(MatrimonyLimits.defaults.freeInterestsPerMonth, 3);
      expect(MatrimonyLimits.defaults.freeProfileViews, 6);
    });
  });

  group('photo privacy', () {
    test('an unknown or missing setting falls back to the restrictive one', () {
      // Withholding a photograph is the safe failure; showing one is not.
      expect(PhotoVisibility.fromId(''), PhotoVisibility.onAccept);
      expect(PhotoVisibility.fromId('something_new'), PhotoVisibility.onAccept);
      expect(PhotoVisibility.fromId('members'), PhotoVisibility.members);
    });
  });

  group('height', () {
    test('centimetres read back as feet and inches', () {
      expect(_height(168).heightLabel, '5 ft 6 in');
      // 152cm is 59.84in: the inches round to 12, which carries into the feet.
      expect(_height(152).heightLabel, '5 ft');
    });

    test('a rounding that lands on twelve inches becomes the next foot', () {
      // 181.5cm is 71.46in — rounds to 72in within the 5ft bucket, which is
      // not a height anybody writes down.
      expect(_height(182).heightLabel, isNot(contains('12 in')));
    });

    test('an unrecorded height is blank, not "0 ft"', () {
      expect(_height(0).heightLabel, '');
    });
  });

  group('filters', () {
    test('clearing one filter does not clear the others', () {
      const filters = MatrimonyFilters(
        gender: Gender.female,
        minAge: 24,
        diet: Diet.vegetarian,
      );
      final cleared = filters.copyWith(gender: null);

      expect(cleared.gender, isNull);
      expect(cleared.minAge, 24, reason: 'unrelated filters must survive');
      expect(cleared.diet, Diet.vegetarian);
    });

    test('the active count drives the badge', () {
      expect(const MatrimonyFilters().activeCount, 0);
      expect(const MatrimonyFilters().isEmpty, isTrue);
      expect(
        const MatrimonyFilters(
          gender: Gender.male,
          minAge: 25,
          hometown: 'Kotagiri',
        ).activeCount,
        3,
      );
    });
  });
}

MatrimonyProfile _height(int cm) => MatrimonyProfile(
  id: 'x',
  ownerUid: 'x',
  postedBy: PostedBy.self,
  name: 'Test',
  gender: Gender.female,
  dob: null,
  birthTime: '',
  birthPlace: '',
  heightCm: cm,
  maritalStatus: MaritalStatus.neverMarried,
  diet: Diet.vegetarian,
  education: '',
  occupation: '',
  workLocation: '',
  hometown: '',
  motherTongue: '',
  about: '',
  fatherOccupation: '',
  motherOccupation: '',
  siblings: '',
  photoVisibility: PhotoVisibility.onAccept,
  photos: const [],
  hasPhotos: false,
  status: MatrimonyStatus.approved,
  reviewNote: null,
  createdAt: null,
  updatedAt: null,
  viewCount: 0,
);
