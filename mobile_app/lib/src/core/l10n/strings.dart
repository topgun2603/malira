/// Reader language.
///
/// Deliberately not Flutter's `Locale` / ARB machinery. The app has exactly two
/// languages and a few dozen strings, and — more importantly — the content
/// itself is bilingual per document rather than per app. A story may be
/// published English-only, and the reader still has Tamil selected. That
/// fallback rule is the real localisation logic here, and it belongs next to
/// the strings rather than buried in a generated file.
enum ReaderLanguage {
  en('en', 'English', 'English'),
  ta('ta', 'Tamil', 'தமிழ்');

  const ReaderLanguage(this.code, this.englishName, this.nativeName);

  final String code;
  final String englishName;
  final String nativeName;

  static ReaderLanguage fromCode(String? code) =>
      code == 'ta' ? ReaderLanguage.ta : ReaderLanguage.en;
}

/// UI copy, and the content-picking rule.
///
/// Mirrors `useLanguage()` in `web-admin/src/components/reader/language.tsx`
/// exactly, including the fallback: Tamil is used only when the Tamil field is
/// actually filled. Showing a blank where a headline should be is worse than
/// showing English, and it is why articles are allowed to be English-only.
class Strings {
  const Strings(this.lang);

  final ReaderLanguage lang;

  bool get isTamil => lang == ReaderLanguage.ta;

  /// The content rule: Tamil when selected *and* present, English otherwise.
  String pick(String en, String ta) =>
      isTamil && ta.trim().isNotEmpty ? ta : en;

  /// Which language [pick] actually returned, for the reader who needs to know
  /// whether a fallback happened.
  ReaderLanguage pickedLanguage(String en, String ta) =>
      isTamil && ta.trim().isNotEmpty ? ReaderLanguage.ta : ReaderLanguage.en;

  String _t(String en, String ta) => isTamil ? ta : en;

  // ------------------------------- Masthead --------------------------------
  String get appName => _t('MALIRA', 'மலிரா');

  /// The tagline under the wordmark.
  String get tagline =>
      _t('Love, Rooted in the Hills', 'மலைகளில் வேரூன்றிய அன்பு');
  String get todayFromDistrict =>
      _t('Today from the district', 'இன்றைய செய்திகள்');
  String get mastheadBlurb => _t(
    'Local reporting, community notices and news from the tea gardens.',
    'உள்ளூர் செய்திகள், சமூக அறிவிப்புகள் மற்றும் தேயிலைத் தோட்டச் செய்திகள்.',
  );

  // -------------------------------- Tabs -----------------------------------
  String get news => _t('News', 'செய்திகள்');
  String get events => _t('Events', 'நிகழ்வுகள்');
  String get songs => _t('Songs', 'பாடல்கள்');
  String get saved => _t('Saved', 'சேமித்தவை');
  String get more => _t('More', 'மேலும்');

  // -------------------------------- Feed -----------------------------------
  String get all => _t('All', 'அனைத்தும்');
  String get topStory => _t('Top story', 'முக்கியச் செய்தி');
  String get moreStories => _t('More stories', 'மேலும் செய்திகள்');
  String get mostRead => _t('Most read', 'அதிகம் படித்தவை');
  String get video => _t('Video', 'காணொளி');
  String get loadMore => _t('Load more', 'மேலும் காட்டு');
  String get endOfFeed =>
      _t('You are all caught up.', 'அனைத்துச் செய்திகளையும் பார்த்துவிட்டீர்கள்.');
  String get noStories =>
      _t('No stories published yet', 'இன்னும் செய்திகள் இல்லை');
  String get noStoriesBody => _t(
    'Anything the desk publishes appears here straight away.',
    'ஆசிரியர் குழு செய்தி வெளியிட்டவுடன் இங்கே தோன்றும்.',
  );
  String get noStoriesInCategory => _t(
    'Nothing in this section yet',
    'இந்தப் பிரிவில் இன்னும் செய்திகள் இல்லை',
  );

  // ------------------------------- Article ---------------------------------
  String get share => _t('Share', 'பகிர்');
  String get save => _t('Save', 'சேமி');
  String get savedDone => _t('Saved', 'சேமிக்கப்பட்டது');
  String get removed => _t('Removed', 'நீக்கப்பட்டது');
  String get textSize => _t('Text size', 'எழுத்து அளவு');
  String get watchOnYouTube => _t('Watch on YouTube', 'YouTube-ல் பார்க்க');
  String get relatedStories => _t('Related stories', 'தொடர்புடைய செய்திகள்');
  String get source => _t('Source', 'ஆதாரம்');
  String get storyNotFound => _t('Story not available', 'செய்தி கிடைக்கவில்லை');
  String get storyNotFoundBody => _t(
    'It may have been withdrawn by the desk.',
    'இது ஆசிரியர் குழுவால் திரும்பப் பெறப்பட்டிருக்கலாம்.',
  );
  String get showingEnglish => _t(
    'This story has not been translated yet.',
    'இந்தச் செய்தி இன்னும் தமிழில் வெளியிடப்படவில்லை.',
  );

  // -------------------------------- Events ---------------------------------
  String get upcoming => _t('Upcoming', 'வரவிருக்கும்');
  String get noEvents => _t('No events listed', 'நிகழ்வுகள் எதுவும் இல்லை');
  String get noEventsBody => _t(
    'Community events appear here once the desk publishes them.',
    'ஆசிரியர் குழு வெளியிட்டவுடன் சமூக நிகழ்வுகள் இங்கே தோன்றும்.',
  );
  String get venue => _t('Venue', 'இடம்');
  String get organiser => _t('Organiser', 'ஏற்பாட்டாளர்');
  String get openMap => _t('Open in Maps', 'வரைபடத்தில் திற');
  String get call => _t('Call', 'அழை');
  String get today => _t('Today', 'இன்று');
  String get tomorrow => _t('Tomorrow', 'நாளை');
  String get cancelled => _t('Cancelled', 'ரத்து செய்யப்பட்டது');

  // The time buckets the events timeline groups into. Relative rather than
  // calendar months, because "this week" is how somebody actually thinks about
  // whether they can get to something.
  String get nextUp => _t('Next up', 'அடுத்தது');
  String get thisWeek => _t('This week', 'இந்த வாரம்');
  String get thisMonth => _t('This month', 'இந்த மாதம்');
  String get later => _t('Later', 'பின்னர்');
  String get pastEvents => _t('Past events', 'முடிந்த நிகழ்வுகள்');
  String get allCategories => _t('All', 'அனைத்தும்');
  String get today2 => _t('Today', 'இன்று');
  String inDays(int days) => isTamil
      ? '$days நாட்களில்'
      : 'In $days ${days == 1 ? 'day' : 'days'}';

  // -------------------------------- Songs ----------------------------------
  String get newReleases => _t('New releases', 'புதிய வெளியீடுகள்');
  String get playlists => _t('Playlists', 'பாடல் பட்டியல்கள்');
  String get allSongs => _t('All songs', 'அனைத்துப் பாடல்கள்');
  String get noSongs => _t('No songs yet', 'இன்னும் பாடல்கள் இல்லை');
  String get noSongsBody => _t(
    'Songs and videos added by the desk appear here.',
    'ஆசிரியர் குழு சேர்க்கும் பாடல்களும் காணொளிகளும் இங்கே தோன்றும்.',
  );
  String get latestRelease => _t('Latest release', 'சமீபத்திய வெளியீடு');
  String get playOnYouTube => _t('Play on YouTube', 'YouTube-ல் இயக்கு');
  String songCount(int count) => isTamil
      ? '$count பாடல்கள்'
      : '$count ${count == 1 ? 'song' : 'songs'}';
  String get browseAll => _t('Everything', 'அனைத்தும்');

  // -------------------------------- Saved ----------------------------------
  String get nothingSaved => _t('Nothing saved yet', 'இன்னும் எதுவும் சேமிக்கப்படவில்லை');
  String get nothingSavedBody => _t(
    'Tap the bookmark on any story to keep it here for reading offline.',
    'எந்தச் செய்தியிலும் புத்தகக்குறியைத் தட்டி இங்கே சேமித்து வைக்கலாம்.',
  );

  // ------------------------------ More / settings ---------------------------
  String get settings => _t('Settings', 'அமைப்புகள்');
  String get language => _t('Language', 'மொழி');
  String get appearance => _t('Appearance', 'தோற்றம்');
  String get themeSystem => _t('Match device', 'சாதனத்தைப் பின்பற்று');
  String get themeLight => _t('Light', 'வெளிச்சம்');
  String get themeDark => _t('Dark', 'இருள்');
  String get about => _t('About', 'எங்களைப் பற்றி');
  String get contact => _t('Contact', 'தொடர்பு');
  String get archive => _t('Archive', 'பழைய செய்திகள்');
  String get search => _t('Search', 'தேடு');
  String get searchHint => _t('Search headlines', 'தலைப்புச் செய்திகளில் தேடு');
  String get noResults => _t('No matches', 'எதுவும் கிடைக்கவில்லை');
  String get version => _t('Version', 'பதிப்பு');

  // -------------------------------- States ---------------------------------
  String get retry => _t('Try again', 'மீண்டும் முயற்சி');
  String get offlineTitle => _t('Cannot reach the newsroom', 'செய்திகளைப் பெற முடியவில்லை');
  String get offlineBody => _t(
    'Check your connection. Saved stories still open.',
    'இணைப்பைச் சரிபார்க்கவும். சேமித்த செய்திகளைப் படிக்கலாம்.',
  );

  // ---------------------------- Notifications ------------------------------
  String get notifications => _t('Notifications', 'அறிவிப்புகள்');
  String get noNotifications => _t('Nothing yet', 'இதுவரை எதுவும் இல்லை');
  String get noNotificationsBody => _t(
    'Announcements from the association will appear here.',
    'சங்கத்தின் அறிவிப்புகள் இங்கே தோன்றும்.',
  );

  // -------------------------------- Poll -----------------------------------
  String get poll => _t('Community poll', 'சமூகக் கருத்துக் கணிப்பு');
  String get vote => _t('Vote', 'வாக்களி');
  String get votes => _t('votes', 'வாக்குகள்');
  String get thanksForVoting => _t('Thanks for voting', 'வாக்களித்ததற்கு நன்றி');
  String get pollClosed => _t('Voting has closed', 'வாக்களிப்பு முடிந்தது');

  // ------------------------------ Onboarding -------------------------------
  String get next => _t('Next', 'அடுத்து');
  String get skip => _t('Skip', 'தவிர்');
  String get startReading => _t('Start reading', 'படிக்கத் தொடங்கு');

  String get onboardNewsTitle =>
      _t('The district, every day', 'தினமும் மாவட்டச் செய்திகள்');
  String get onboardNewsBody => _t(
    'Everything the association publishes, in one place and free to everyone.',
    'சங்கம் வெளியிடும் அனைத்தும் ஒரே இடத்தில், அனைவருக்கும் இலவசம்.',
  );
  String get onboardNewsBullet1 => _t(
    'Local reporting, notices and government updates',
    'உள்ளூர் செய்திகள், அறிவிப்புகள், அரசு தகவல்கள்',
  );
  String get onboardNewsBullet2 => _t(
    'Festivals, meetings and functions on one calendar',
    'பண்டிகைகள், கூட்டங்கள், விழாக்கள் ஒரே நாட்காட்டியில்',
  );
  String get onboardNewsBullet3 => _t(
    'Save a story to read later without signal',
    'இணைப்பு இல்லாமல் படிக்க செய்திகளைச் சேமிக்கலாம்',
  );

  String get onboardMatrimonyTitle =>
      _t('Matrimony, with care', 'திருமணத் தகவல், கவனத்துடன்');
  String get onboardMatrimonyBody => _t(
    'The one part of the app that asks for an account, because it holds real family details.',
    'உண்மையான குடும்ப விவரங்கள் இருப்பதால், இந்தப் பகுதிக்கு மட்டும் கணக்கு தேவை.',
  );
  String get onboardMatrimonyBullet1 => _t(
    'Every profile is reviewed by the association',
    'ஒவ்வொரு தகவலும் சங்கத்தால் பரிசீலிக்கப்படுகிறது',
  );
  String get onboardMatrimonyBullet2 => _t(
    'Contact details only after both sides accept',
    'இருவரும் ஏற்ற பிறகே தொடர்பு விவரங்கள்',
  );
  String get onboardMatrimonyBullet3 => _t(
    'News, events and songs never need an account',
    'செய்திகள், நிகழ்வுகள், பாடல்களுக்குக் கணக்கு தேவையில்லை',
  );

  String get onboardSizeTitle =>
      _t('Comfortable to read?', 'படிக்க வசதியாக உள்ளதா?');
  String get onboardSizeBody => _t(
    'Pick the size that suits you. You can change it later from any story.',
    'உங்களுக்கு ஏற்ற அளவைத் தேர்ந்தெடுக்கவும். பின்னரும் மாற்றலாம்.',
  );
  String get onboardSizeSample => _t(
    'Tea auction prices held steady at Coonoor this week, with the season '
        'closing a little earlier than last year.',
    'இந்த வாரம் குன்னூர் தேயிலை ஏல விலை நிலையாக இருந்தது. கடந்த ஆண்டை விட '
        'சீசன் சற்று முன்னதாக முடிவடைகிறது.',
  );

  // ------------------------------- Account ---------------------------------
  String get signIn => _t('Sign in', 'உள்நுழை');
  String get signOut => _t('Sign out', 'வெளியேறு');
  String get register => _t('Create an account', 'கணக்கு உருவாக்கு');
  String get email => _t('Email', 'மின்னஞ்சல்');
  String get password => _t('Password', 'கடவுச்சொல்');
  String get yourName => _t('Your name', 'உங்கள் பெயர்');
  String get addYourName => _t('Add your name', 'உங்கள் பெயரைச் சேர்க்கவும்');
  String get forgotPassword => _t('Forgot password?', 'கடவுச்சொல் மறந்துவிட்டதா?');
  String get resetSent => _t(
    'A reset link is on its way to that address.',
    'மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது.',
  );
  String get haveAccount =>
      _t('Already have an account?', 'ஏற்கனவே கணக்கு உள்ளதா?');
  String get needAccount => _t('New here?', 'புதியவரா?');
  String get accountBlocked => _t(
    'This account has been blocked. Contact the association.',
    'இந்தக் கணக்கு தடை செய்யப்பட்டுள்ளது. சங்கத்தைத் தொடர்பு கொள்ளவும்.',
  );
  // Phone sign-in. The primary route for this readership: a number they
  // already know, and no password to remember or reset.
  String get mobileNumber => _t('Mobile number', 'கைபேசி எண்');
  String get continueLabel => _t('Continue', 'தொடர்க');
  String get sendCode => _t('Send code', 'குறியீடு அனுப்பு');
  String get enterCode => _t('Enter the code', 'குறியீட்டை உள்ளிடவும்');
  String codeSentTo(String number) => isTamil
      ? '$number எண்ணுக்கு 6 இலக்கக் குறியீடு அனுப்பப்பட்டது.'
      : 'We sent a 6-digit code to $number.';
  String get resendCode => _t('Send it again', 'மீண்டும் அனுப்பு');
  String resendIn(int seconds) =>
      isTamil ? '$seconds வினாடிகளில்' : 'Resend in ${seconds}s';
  String get changeNumber => _t('Change number', 'எண்ணை மாற்று');
  String get verifying => _t('Checking…', 'சரிபார்க்கிறது…');
  String get badNumber => _t(
    'Enter a 10-digit Indian mobile number.',
    '10 இலக்க கைபேசி எண்ணை உள்ளிடவும்.',
  );
  String get useEmailInstead =>
      _t('Use email instead', 'மின்னஞ்சலைப் பயன்படுத்து');
  String get usePhoneInstead =>
      _t('Use mobile number instead', 'கைபேசி எண்ணைப் பயன்படுத்து');
  String get smsCharges => _t(
    'Standard SMS charges may apply.',
    'வழக்கமான SMS கட்டணம் பொருந்தும்.',
  );

  String get signedInAs => _t('Signed in as', 'உள்நுழைந்தவர்');
  String get guest => _t('Not signed in', 'உள்நுழையவில்லை');
  String get signInBlurb => _t(
    'An account is only needed for matrimony. News, events and songs stay open to everyone.',
    'திருமணத் தகவலுக்கு மட்டுமே கணக்கு தேவை. செய்திகள், நிகழ்வுகள், பாடல்கள் அனைவருக்கும் திறந்தவை.',
  );

  // ------------------------------ Matrimony --------------------------------
  String get matrimony => _t('Matrimony', 'திருமணத் தகவல்');

  /// The tab label. "திருமணத் தகவல்" is three times the width of "Matrimony"
  /// and left the five Tamil tabs colliding; the section keeps its full name
  /// everywhere it has room.
  String get matrimonyTab => _t('Matrimony', 'திருமணம்');
  String get matrimonyBlurb => _t(
    'Profiles from families across the Nilgiris, each one reviewed before it appears.',
    'நீலகிரி குடும்பங்களின் திருமணத் தகவல்கள், ஒவ்வொன்றும் பரிசீலனைக்குப் பிறகு வெளியிடப்படும்.',
  );
  String get browseProfiles => _t('Browse profiles', 'தகவல்களைப் பார்');
  String get matrimonySearchHint => _t(
    'Search name, work or town',
    'பெயர், தொழில் அல்லது ஊர்',
  );
  String get myProfile => _t('My profile', 'என் தகவல்');
  String get createProfile => _t('Create my profile', 'என் தகவலை உருவாக்கு');
  String get editProfile => _t('Edit profile', 'தகவலைத் திருத்து');
  String get interests => _t('Interests', 'விருப்பங்கள்');
  String get received => _t('Received', 'வந்தவை');
  String get sentTab => _t('Sent', 'அனுப்பியவை');
  String get sendInterest => _t('Send interest', 'விருப்பம் அனுப்பு');
  String get interestSent => _t('Interest sent', 'விருப்பம் அனுப்பப்பட்டது');
  String get accept => _t('Accept', 'ஏற்கிறேன்');
  String get decline => _t('Decline', 'வேண்டாம்');
  String get withdraw => _t('Withdraw', 'திரும்பப் பெறு');
  String get matchedLabel => _t('Matched', 'இணைந்தது');
  String get declinedLabel => _t('Declined', 'மறுக்கப்பட்டது');
  String get withdrawnLabel => _t('Withdrawn', 'திரும்பப் பெறப்பட்டது');
  String get awaitingYourAnswer =>
      _t('Waiting for your answer', 'உங்கள் பதிலுக்காக');
  String get contactDetails => _t('Contact details', 'தொடர்பு விவரங்கள்');
  String get contactLocked => _t(
    'Contact details appear once both sides have accepted.',
    'இருவரும் ஏற்றுக்கொண்ட பிறகே தொடர்பு விவரங்கள் தெரியும்.',
  );
  String get noProfiles => _t('No profiles yet', 'தகவல்கள் எதுவும் இல்லை');
  String get noProfilesBody => _t(
    'Approved profiles appear here. Try widening the filters.',
    'அங்கீகரிக்கப்பட்ட தகவல்கள் இங்கே தோன்றும். வடிகட்டியை மாற்றிப் பாருங்கள்.',
  );
  String get noInterests => _t('Nothing here yet', 'இங்கே எதுவும் இல்லை');
  String get filters => _t('Filters', 'வடிகட்டி');
  String get clearFilters => _t('Clear all', 'அனைத்தையும் நீக்கு');
  String get apply => _t('Apply', 'பயன்படுத்து');
  String get age => _t('Age', 'வயது');
  String get height => _t('Height', 'உயரம்');
  String get anyGender => _t('Anyone', 'அனைவரும்');
  String get hometown => _t('Hometown', 'ஊர்');
  String get education => _t('Education', 'கல்வி');
  String get occupation => _t('Occupation', 'தொழில்');
  String get workLocation => _t('Works in', 'பணியிடம்');
  String get family => _t('Family', 'குடும்பம்');
  String get fatherOccupation => _t('Father occupation', 'தந்தையின் தொழில்');
  String get motherOccupation => _t('Mother occupation', 'தாயின் தொழில்');
  String get siblings => _t('Siblings', 'உடன்பிறந்தவர்கள்');
  String get aboutPerson => _t('About', 'அறிமுகம்');
  String get postedBy => _t('Posted by', 'பதிவு செய்தவர்');
  String get birthDetails => _t('Birth details', 'பிறப்பு விவரங்கள்');
  String get dateOfBirth => _t('Date of birth', 'பிறந்த தேதி');
  String get birthTime => _t('Birth time', 'பிறந்த நேரம்');
  String get birthPlace => _t('Birth place', 'பிறந்த இடம்');
  String get motherTongue => _t('Mother tongue', 'தாய்மொழி');
  String get diet => _t('Diet', 'உணவு முறை');
  String get maritalStatus => _t('Marital status', 'திருமண நிலை');
  String get phone => _t('Phone', 'தொலைபேசி');
  String get horoscope => _t('Horoscope note', 'ஜாதகக் குறிப்பு');
  String get viewHoroscope => _t('View the horoscope', 'ஜாதகத்தைப் பார்');

  // Shared by the photo strip and the horoscope uploader.
  String get takePhoto => _t('Take a photograph', 'புகைப்படம் எடு');
  String get chooseFromGallery =>
      _t('Choose from gallery', 'கேலரியில் இருந்து தேர்ந்தெடு');
  String get photoUploadFailed => _t(
    'That photograph could not be uploaded.',
    'புகைப்படத்தை பதிவேற்ற முடியவில்லை.',
  );
  String get photoPickFailed => _t(
    'Could not open the photo library.',
    'புகைப்படத்தைத் திறக்க முடியவில்லை.',
  );
  String get photoPrivacy => _t('Photo privacy', 'புகைப்பட தனியுரிமை');
  String get photosOnRequest => _t(
    'Photos shared after an accepted interest',
    'விருப்பம் ஏற்கப்பட்ட பிறகு புகைப்படங்கள்',
  );
  String get pauseProfile => _t('Pause my profile', 'என் தகவலை இடைநிறுத்து');
  String get resumeProfile => _t('Put back in the queue', 'மீண்டும் சமர்ப்பி');
  String get markMarried => _t('Marriage fixed', 'திருமணம் நிச்சயமானது');
  String get deleteProfile => _t('Delete my profile', 'என் தகவலை நீக்கு');
  String get report => _t('Report this profile', 'இந்தத் தகவலைப் புகாரளி');
  String get reportReason => _t('What is wrong?', 'என்ன பிரச்சினை?');
  String get reportSent => _t(
    'Reported. A moderator will look at it.',
    'புகார் அனுப்பப்பட்டது. பரிசீலிக்கப்படும்.',
  );
  String get saveAction => _t('Save', 'சேமி');
  String get saveForReview => _t('Send for review', 'பரிசீலனைக்கு அனுப்பு');
  String get profilePending => _t(
    'Your profile is with the association for review.',
    'உங்கள் தகவல் சங்கத்தின் பரிசீலனையில் உள்ளது.',
  );
  String get profileRejected => _t(
    'The association sent this back.',
    'சங்கம் இதைத் திருப்பி அனுப்பியுள்ளது.',
  );
  String get profileLive =>
      _t('Your profile is live.', 'உங்கள் தகவல் வெளியிடப்பட்டுள்ளது.');
  String get profilePaused => _t(
    'Your profile is paused and nobody can see it.',
    'உங்கள் தகவல் இடைநிறுத்தப்பட்டுள்ளது.',
  );
  String get editReturnsToQueue => _t(
    'Saving sends the profile back for review.',
    'சேமித்தால் தகவல் மீண்டும் பரிசீலனைக்குச் செல்லும்.',
  );
  String get interestsLeft =>
      _t('interests left this month', 'விருப்பங்கள் மீதம்');
  String get noInterestsLeft => _t(
    'You have used all your interests this month.',
    'இந்த மாதத்திற்கான விருப்பங்கள் முடிந்துவிட்டன.',
  );
  String get premiumOnWeb => _t(
    'More interests are available on the website.',
    'இணையதளத்தில் கூடுதல் விருப்பங்கள் கிடைக்கும்.',
  );
  String get minimumAgeBlocked => _t(
    'The legal minimum marriage age in India is 21 for a man and 18 for a woman. This profile cannot be listed.',
    'இந்தியாவில் திருமணத்திற்கான குறைந்தபட்ச வயது ஆணுக்கு 21, பெண்ணுக்கு 18. இந்தத் தகவலை வெளியிட முடியாது.',
  );

  /// "Sponsored", never hidden. An ad that a reader mistakes for a story is a
  /// problem for the paper long before it is a problem for the advertiser.
  String get sponsored => _t('Sponsored', 'விளம்பரம்');
}
