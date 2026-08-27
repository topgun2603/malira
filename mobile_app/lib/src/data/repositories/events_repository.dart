import '../firestore_refs.dart';
import '../models/event.dart';

/// Published community events.
///
/// Mirrors `listUpcomingEvents` in the admin panel: published, not archived,
/// soonest first. The archived flag is set by a sweep on the admin side, so the
/// app also splits past from upcoming itself — an event that finished this
/// morning should drop out of the list before the sweep next runs, and a
/// three-day festival that began yesterday should not.
class EventsRepository {
  EventsRepository(this._refs);

  final Refs _refs;

  Stream<List<EventItem>> watchPublished({int max = 100}) {
    return _refs.events
        .where('status', isEqualTo: 'published')
        .where('archived', isEqualTo: false)
        .orderBy('startsAt')
        .limit(max)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(EventItem.fromDoc).toList());
  }

  /// A single event.
  ///
  /// Only `published` comes back. Note that this means a cancelled event is not
  /// merely hidden from the list — `firestore.rules` refuses to serve it at
  /// all, so a reader who saw the notice and opens it again gets "not
  /// available" rather than "cancelled". That is the rules' call, not the
  /// app's, and it is flagged in the README as something the desk should decide
  /// on deliberately.
  Future<EventItem?> eventById(String id) async {
    final snapshot = await _refs.event(id).get();
    if (!snapshot.exists) return null;
    if (snapshot.data()?['status'] != 'published') return null;
    return EventItem.fromDoc(snapshot);
  }
}
