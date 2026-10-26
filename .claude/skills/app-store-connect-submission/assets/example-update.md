# App Store Connect: Visual Neuroscience iOS 2.0

Kind: update
Prepared: 25 October 2026, from release v12.28
Build to pick: 2.0, the build Xcode Cloud uploaded from main after v12.28
Approved: [written in after approval: build, date]

> **An illustration, not a record.** This shows the shape of a finished
> update sheet and the voice of its fields. It was drawn from one project's
> listing notes for its 2.0 update in October 2026 and filled out for the
> example: the keywords, the review notes, the privacy rows and the
> accessibility claims were written for it and are not what App Store
> Connect holds for that app. Take every value in a real sheet from the
> project and from App Store Connect, never from here.

Every field is written out; a line above a field says when it changed, and
the rest stay as 1.0 has them.

## The build

| Check | Value |
|---|---|
| Version and build number | 2.0, the newest build Xcode Cloud uploaded from main |
| Bundle identifier (the record's) | `ai.visualneuroscience.app` |
| App icon | `AppIcon` (the white tile) and the alternate `AppIcon-Black` |
| `ITSAppUsesNonExemptEncryption` | NO |
| Privacy manifest | `PrivacyInfo.xcprivacy`, five required-reason entries |
| Permissions and their purpose strings | none asked for |
| SDK (the Xcode it was made with) | as the Xcode Cloud workflow sets it |
| Device families | iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`); Designed for iPad on Mac |

## App Information

The name and subtitle change in this version: 1.0 was VisualNeuroscience.AI,
Interactive brain atlas. The two fields read together as the owner's chosen
listing name, Visual Neuroscience: 3D Human Brain Atlas.

### Name (30)
```text
Visual Neuroscience
```

### Subtitle (30)
```text
3D Human Brain Atlas
```

### Primary Category
```text
Education
```

### Secondary Category
```text
Medical
```

### Content Rights
```text
Yes. Licensed open datasets (MNI152, AAL, MRIcron Brodmann, HCP1065), the IFEN Brodmann diagram by written permission, the OpenStax textbook under CC BY-NC-SA; recorded in docs/PERMISSIONS.md.
```

### License Agreement
```text
Apple's standard EULA (leave the field empty)
```

## Pricing and Availability

Unchanged.

- Price: free
- Availability: all countries
- iPhone and iPad apps on Apple silicon Macs: on
- iPhone and iPad apps on Apple Vision Pro: on

## App Privacy

Changed: 2.0 is the first version with usage counts, and a new account can
join the newsletter. Publish after editing.

### Privacy Policy URL
```text
https://visualneuroscience.ai/privacy.html
```

| Data type | Linked | Tracking | Purposes | Why (the code) |
|---|---|---|---|---|
| Contact Info → Email Address | yes | no | App Functionality, Developer's Advertising or Marketing | the account (Firebase Auth); the newsletter box on Create account (Mailchimp) |
| Contact Info → Name | yes | no | App Functionality | the account's display name |
| Identifiers → User ID | yes | no | App Functionality | the account's id and username |
| User Content → Other User Content | yes | no | App Functionality | practice progress and saved models (Firestore) |
| Usage Data → Product Interaction | no | no | Analytics | screens and sign-ins (Google Analytics for Firebase) |
| Identifiers → Device ID | no | no | Analytics | the analytics install identifier; built without the advertising identifier |

## App Accessibility

| Device | Claimed | How it was known |
|---|---|---|
| iPhone, iPad | Dark Interface | the theme switch under Account; every page follows it |
| iPhone, iPad | Reduced Motion | prefers-reduced-motion turns every slide into a fade (viewer.css) |

Not claimed: VoiceOver and Voice Control (the scans are dragged), Larger
Text (the pages do not follow Dynamic Type), Sufficient Contrast and
Differentiate Without Colour Alone (untested), Captions and Audio
Descriptions (no video).

## Version 2.0

Screenshots, slot by slot, each set in the owner's order 01 to 10:
13-inch iPad `ipad-13-land-`; iPhone 6.3-inch, required, `iphone-6.3-`;
iPhone 6.9-inch `iphone-6.9-`; iPhone Duo outer `iphone-duo-` and inner
`iphone-duo-land-`, only if the build was made with Xcode 27.1.

### Promotional Text (170)
```text
A free 3D atlas of the human brain: regions, Brodmann areas, receptors, cells, white matter and networks, with revision questions and an AI connector. Works offline.
```

### Description (4000)
```text
Visual Neuroscience is an interactive 3D atlas of the human brain, built for anyone learning neuroanatomy without a lab or a licence. Turn a real MNI152 brain, tap through its regions, search Brodmann areas by what they do, follow the white-matter tracts, go down to the cell and the molecule, and see published studies drawn on the scan itself. Everything ships inside the app and renders on your device, so it works on a train, at the back of a lecture theatre, or in aeroplane mode.

WHAT IS INSIDE

• 3D Region Atlas: the MNI152 template with the AAL-116 parcellation. Pick any region, highlight it in three planes and in 3D, and read what it does.
• Brodmann Area Atlas: the classic cortical map, both faces of the hemisphere on one screen beside the brain in 3D. Tap any area to read what it does.
• Tractography: the HCP1065 whole-brain tractogram. Rotate it, slice it, follow the bundles.
• Receptor density: where the major neurotransmitter receptors sit, from published PET and autoradiography, with a source behind every number.
• Network Atlas: the brain's large-scale networks in six states, from flow to meditation.
• Microanatomy: a neuron drawn part by part with a quiz to learn it, the neurotransmitters as chemists draw them, and a hundred and fifty receptors, channels and transporters with the drugs that act on them.
• Molecular: the dopamine and serotonin receptors in 3D, from experimental structures. Watch the neurotransmitter dock, see where antipsychotics, triptans, LSD and psilocin sit in the same pocket, and compare the subtypes.
• Visualising Studies: published papers drawn onto the scan, beginning with a study of auditory hallucinations in schizophrenia.
• Digital Textbook: OpenStax's Introduction to Behavioral Neuroscience in full, nineteen chapters, with every figure and reference.
• Practice: adaptive questions that score as you go, lean toward what you keep getting wrong, and explain every answer. The first bank follows the KCL MSc Neuroscience syllabus.

AI CONNECTOR

Ask the atlas from Claude, ChatGPT, Kimi or any assistant that supports the Model Context Protocol: what a region does, where a receptor is densest, how the brain changes in a state. Each answer links to the view it describes; the About tab shows how to connect.

MADE FOR TOUCH, AND FOR A DESK

Pinch to zoom on every scan and diagram, two fingers to pan, one to rotate; on a Mac the same works with a trackpad. Save a view as a picture, or the brain as a 3D model to open in your room.

AN ACCOUNT, ONLY IF YOU WANT ONE

Sign in with Apple, Google or email to keep your practice progress and saved models across iPhone, iPad, Mac and the web. Nothing requires an account, nothing is sold, and there is no advertising and no tracking. Delete the account from inside the app at any time.

BUILT ON OPEN DATA

The MNI152 template, the AAL parcellation, the MRIcron Brodmann atlas and the HCP1065 tractogram, rendered with NiiVue; receptor structures from the Protein Data Bank. Each page says where its data came from and where the evidence stops. Brodmann Areas diagram adapted with permission from IFEN – Institute for EEG-Neurofeedback / Neurofeedback Academy.

WHO IT IS FOR

Students revising between lectures. Lecturers who want a live brain on the screen instead of a slide. And anyone who wanted to study this and was priced out.

Built by one developer, with the help of AI and a PG Cert in Applied Neuroscience from King's College London Online, so that the next generation of neuroscientists and psychologists has a map of the brain that is easy to use and understand. The website and the app share the same code and the same author. If something is missing for your course, write, and it usually ships within the week.

Not a medical device and not a diagnostic tool. An educational reference that summarises published work and draws published atlases, with its sources on every page.

Also on the web at visualneuroscience.ai
```

Changed: the keywords drop the words the name and subtitle already carry
and add terms no other listing uses.

### Keywords (100)
```text
neuroanatomy,MRI,Brodmann,tractography,cortex,anatomy,neuron,receptor,MNI152,AAL,student,revision
```

### Support URL
```text
https://visualneuroscience.ai/about.html
```

### Marketing URL
```text
https://visualneuroscience.ai
```

### Version
```text
2.0
```

### Copyright
```text
2026 Fadil Karim
```

### What's New in This Version (4000)
```text
• A tab bar: Atlases, Library, Practice, About and Account, each a page of its own that keeps its place when you switch away and back. Light or dark is chosen under Account.
• AI Connector: ask the atlas from Claude, ChatGPT, Kimi or any assistant that supports the Model Context Protocol. Each answer links to the view it describes, and the About tab shows how to connect.
• Every atlas fills the screen like an anatomy app: the views take the room, the tools run along a bar at the foot, and the regions sit in a drawer you can hide. Each atlas remembers where you left it, cuts and all.
• Microanatomy: a neuron drawn part by part, with twenty structures to tap and a quiz to learn them, seventeen neurotransmitters drawn the way chemists draw them, and a hundred and fifty receptors, channels and transporters, each with the drugs that act on it.
• Molecular: the dopamine and serotonin receptors themselves in 3D, built from thirty-nine experimental structures. Watch the neurotransmitter dock and switch the receptor on, see where antipsychotics, triptans, LSD and psilocin sit in the same pocket, and compare the subtypes. The binding tour reads at two levels, Simple and Detailed.
• The Brodmann Area Atlas: both faces of the cortex on one screen, with the brain in 3D and what each area does beside it. The areas light up on the scan in the 3D Region Atlas too, searchable by number, name or what they do.
• Receptor densities now come from published PET and autoradiography, with a source behind every number, in a tabbed window: the graph, the table of every receptor against every region, the receptor's own drawings, the receptor types and the sources.
• Tractography fills the screen and can be sliced like the atlas, and the Network Atlas shows its ring of connections beside the scans.
• The slice tool marks the centre of each slider, and Reset slice puts every cut back.
• Turn the phone sideways in the 3D Region Atlas and the views take the whole height.
• The Hallucinations study is a screen like the atlas, with the paper, the reading, the circuit, the imaging and the limits each a button away.
• The Digital Textbook is now OpenStax's Introduction to Behavioral Neuroscience in full, nineteen chapters, with its citations opening where they stand.
• A new icon: the brain wired with circuit traces, on a white tile or, from a switch under Account, a black one.
• Your account has a page of its own: everything it holds, a copy to download, a new password and deletion. Deleting an account signed in with Apple revokes Sign in with Apple as well. A new account can ask for feature announcements by email.
• Terms of use and a page on deleting your account, both under Account, and a message from the developer under About.
• The app now tells you when a newer version is on the App Store.
```

## App Review Information

### Sign-in required
```text
No (accounts are optional); a demo account is given anyway
```

### User name
```text
[[the demo account's email address]]
```

### Password
```text
[[the demo account's password, typed into App Store Connect only]]
```

### Contact first name
```text
Fadil
```

### Contact last name
```text
Karim
```

### Contact phone
```text
[[the review contact's phone number, with its country code]]
```

### Contact email
```text
fkarim@visualneuroscience.ai
```

### Notes (4000)
```text
Visual Neuroscience is an educational neuroanatomy reference: published brain atlases rendered on the device, with what each region does, receptor maps, a cited textbook and practice questions.

What is new for review in 2.0: a native tab bar (Atlases, Library, Practice, About, Account); the Account tab's rows for the privacy policy, the terms and account deletion; Sign in with Google beside Sign in with Apple and email; an alert when a newer version is on the App Store.

Accounts are optional. They keep practice progress and saved models across devices, and nothing else needs one. A demo account is in the fields above. To delete an account: Account tab, Delete your account, pressed twice. Deleting an account signed in with Apple revokes its Sign in with Apple token in the app. The deletion page: https://visualneuroscience.ai/delete-account.html

The anatomy works with the network off: the MNI152 template, the AAL and Brodmann atlases and the HCP1065 tractogram ship inside the app. Turn on aeroplane mode and open any atlas to see it.

The pages are drawn in a web view inside a native SwiftUI shell. The tab bar and navigation, Sign in with Apple and Google, the share sheet, file export and haptics are native, and every file the app needs is in its bundle. Original app by a single developer; the About tab says who made it.

It is not a diagnostic or clinical tool. Every page says so and cites its sources.

The Posters page (Library tab) offers printed posters, which are physical goods: its buttons will open a print-on-demand shop in the system browser, outside the app, with no in-app purchase (guideline 3.1.5(a)). Until the shop opens they read "Shop opening soon".

The AI Connector page (About tab) explains how to ask the atlas from an AI assistant through an MCP server; the app itself calls no AI service.

Contact: fkarim@visualneuroscience.ai
```

## Release

### App Store Version Release
```text
Automatically release this version
```

### Phased Release
```text
Off
```

### Reset Rating
```text
No
```

## Age Rating

Alcohol, Tobacco, or Drug Use or References: Infrequent. The receptor and
drug pages name LSD, psilocin, ketamine, cocaine, nicotine and cannabis in a
pharmacological sense, and the study and the practice questions mention
antipsychotics. Everything else None or No. 1.0 was rated 12+ on the
questionnaire before Apple's 2025 ratings; read the new result off the page.

## Export Compliance

`ITSAppUsesNonExemptEncryption` in `Info.plist`: NO, so no question at upload.

## After approval

[The build that went out, the date, anything the reviewer asked.]
