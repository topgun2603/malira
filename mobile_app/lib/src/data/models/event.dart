import 'package:cloud_firestore/cloud_firestore.dart';

import 'article.dart';
import 'parsing.dart';

/// Mirrors `EVENT_CATEGORIES` and both label maps in the admin panel, including
/// the Tamil labels — those are the association's own wording and are not
/// re-translated here.
enum EventCategory {
  festival('festival', 'Festival', 'பண்டிகை'),
  meeting('meeting', 'Public meeting', 'பொதுக் கூட்டம்'),
  function('function', 'Wedding / function', 'திருமணம் / விழா'),
  sports('sports', 'Sports', 'விளையாட்டு'),
  cultural('cultural', 'Cultural', 'கலை நிகழ்ச்சி');

  const EventCategory(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static EventCategory fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => EventCategory.meeting,
  );
}

/// A published community event.
class EventItem {
  const EventItem({
    required this.id,
    required this.title,
    required this.titleTa,
    required this.description,
    required this.descriptionTa,
    required this.category,
    required this.startsAt,
    required this.endsAt,
    required this.venue,
    required this.venueTa,
    required this.mapUrl,
    required this.organiserName,
    required this.organiserPhone,
    required this.poster,
    required this.cancelled,
  });

  factory EventItem.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    final poster = data['poster'];
    return EventItem(
      id: doc.id,
      title: data.str('title'),
      titleTa: data.str('titleTa'),
      description: data.str('description'),
      descriptionTa: data.str('descriptionTa'),
      category: EventCategory.fromId(data.str('category')),
      startsAt: data.time('startsAt'),
      endsAt: data.time('endsAt'),
      venue: data.str('venue'),
      venueTa: data.str('venueTa'),
      mapUrl: data.str('mapUrl'),
      organiserName: data.str('organiserName'),
      organiserPhone: data.str('organiserPhone'),
      poster: poster is Map
          ? ArticleImage.fromMap(poster.cast<String, dynamic>())
          : null,
      cancelled: data.str('status') == 'cancelled',
    );
  }

  final String id;
  final String title;
  final String titleTa;
  final String description;
  final String descriptionTa;
  final EventCategory category;
  final DateTime? startsAt;
  final DateTime? endsAt;

  /// Free text. A village venue rarely has a postal address, which is why the
  /// admin panel keeps this unstructured and the app only ever renders it.
  final String venue;
  final String venueTa;

  /// A pasted Google Maps link. Never parsed, only opened.
  final String mapUrl;

  final String organiserName;
  final String organiserPhone;
  final ArticleImage? poster;
  final bool cancelled;

  bool get isPast {
    final end = endsAt ?? startsAt;
    return end != null && end.isBefore(DateTime.now());
  }
}
