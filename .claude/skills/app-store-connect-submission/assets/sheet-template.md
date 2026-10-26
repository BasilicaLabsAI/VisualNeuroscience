# App Store Connect: [App] [platform] [version]

Kind: [first submission | new platform | update]
Prepared: [date], from [the project's release or commit]
Build to pick: [version] ([build number]), uploaded [date]
Approved: [written in after approval: build, date]

Every field in the order App Store Connect asks for it. Each block is
pasted as it stands; `scripts/check_sheet.py` counts them against Apple's
limits. Text in `[[double brackets]]` inside a block is typed by hand into
App Store Connect and never kept here (a password, a phone number); in the
prose around the blocks it is a question still open for the person, and
the sheet is not ready until it is answered. On an update every field is
still written out, so the sheet is the record of what the store holds; a
line under each heading says whether it changed. A new platform's sheet
records the record's shared fields as they stand and writes that
platform's own (`references/fields.md`, section 11).

<!-- Delete the sections that do not apply. Keep the heading format
     "### Field (limit)" and one fenced block under it: the checker reads
     them. A heading without a limit has no count. The Kind line begins
     with one of the three kinds exactly as written above. -->

## The build

| Check | Value |
|---|---|
| Version and build number | |
| Bundle identifier (the record's) | |
| App icon | |
| `ITSAppUsesNonExemptEncryption` | |
| Privacy manifest | |
| Permissions and their purpose strings | |
| SDK (the Xcode it was made with) | |
| Device families | |

## New App (first submission only)

### Name (30)
```text
```

### Primary Language
```text
```

### Bundle ID
```text
```

### SKU
```text
```

## App Information (one for the record, shared by every platform)

### Name (30)
```text
```

### Subtitle (30)
```text
```

### Primary Category
```text
```

### Secondary Category
```text
```

### Content Rights
```text
```

### License Agreement
```text
Apple's standard EULA (leave the field empty)
```

## Pricing and Availability (shared)

- Price:
- Availability:
- iPhone and iPad apps on Apple silicon Macs:
- iPhone and iPad apps on Apple Vision Pro:

## App Privacy (shared)

### Privacy Policy URL
```text
```

### User Privacy Choices URL
```text
```

| Data type | Linked | Tracking | Purposes | Why (the code) |
|---|---|---|---|---|

## App Accessibility (per device family)

| Device | Claimed | How it was known |
|---|---|---|

## Version [version]

Screenshots, slot by slot, in order: [slot → files, each checked with
`scripts/check_screenshots.py`].

### Promotional Text (170)
```text
```

### Description (4000)
```text
```

### Keywords (100)
```text
```

### Support URL
```text
```

### Marketing URL
```text
```

### Version
```text
```

### Copyright
```text
```

### What's New in This Version (4000)
```text
```

## App Review Information

### Sign-in required
```text
```

### User name
```text
```

### Password
```text
[[the demo account's password, typed into App Store Connect only]]
```

### Contact first name
```text
```

### Contact last name
```text
```

### Contact phone
```text
[[the review contact's phone number, with its country code]]
```

### Contact email
```text
```

### Notes (4000)
```text
```

## Release

### App Store Version Release
```text
```

### Phased Release
```text
```

### Reset Rating
```text
```

## Age Rating (shared)

Every answer that is not None or No, with the screen that causes it, and
the rating App Store Connect computed.

## Export Compliance

`ITSAppUsesNonExemptEncryption` in `Info.plist`: [value].

## Information Needed reply (a new account's first submission; otherwise only if asked)

### Reply (4000)
```text
```

The recording, in order: [shot list].

## After approval

[The build that went out, the date, anything the reviewer asked.]
