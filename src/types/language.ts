/**
 * The two language sets the API uses are **different sets**, and they are easy
 * to confuse. They are declared here, side by side, on purpose.
 *
 * - `TranscriptionLanguage` — standard tests and mapping. Region-qualified,
 *   defaults to `en-GB`.
 * - `CallLanguage` — mission tests. Mostly bare codes, defaults to English.
 *
 * Ten codes (`es`, `fr`, `de`, `it`, `pt`, `nl`, `hi`, `ru`, `ja`, `multi`)
 * are members of both, which is what makes the mismatch so easy to miss. The
 * one that bites is `en`: a valid `CallLanguage`, and **not** a
 * `TranscriptionLanguage` at all.
 */

/**
 * Transcription language for standard tests (`testing.configs`) and mapping
 * (`MappingJobConfig.language`) — the language the call audio is transcribed
 * in.
 *
 * **Defaults to `en-GB`** when absent. On update, omitting the field leaves the
 * saved value untouched; there is no implicit reset to the default.
 *
 * Distinct from `CallLanguage`, the mission-test call language. The sets are
 * not interchangeable and the overlap hides the difference. **The trap: bare
 * `'en'` is a valid `CallLanguage` and is rejected with a 400 here** — this set
 * has no bare `'en'`, only region-qualified `'en-GB'`, `'en-US'`, `'en-AU'`,
 * `'en-IN'` and `'en-NZ'`. Never copy a code from one field to the other.
 *
 * `'multi'` code-switches. `'nl-BE'` is Flemish and `'zh-HK'` is Cantonese.
 *
 * Source of truth: `api/packages/core/transcription/languages.ts`. The API's
 * OpenAPI document does not publish this enum yet (it still types the field as
 * a bare string), so it is not the reference for this list.
 */
export type TranscriptionLanguage =
  | 'en-GB'
  | 'en-US'
  | 'en-AU'
  | 'en-IN'
  | 'en-NZ'
  | 'multi'
  | 'ar'
  | 'be'
  | 'bn'
  | 'bs'
  | 'bg'
  | 'ca'
  | 'zh-HK'
  | 'zh'
  | 'hr'
  | 'cs'
  | 'da'
  | 'nl'
  | 'et'
  | 'fi'
  | 'nl-BE'
  | 'fr'
  | 'de'
  | 'el'
  | 'gu'
  | 'he'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'kn'
  | 'ko'
  | 'lv'
  | 'lt'
  | 'mk'
  | 'ms'
  | 'mr'
  | 'no'
  | 'fa'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sr'
  | 'sk'
  | 'sl'
  | 'es'
  | 'sv'
  | 'tl'
  | 'ta'
  | 'te'
  | 'th'
  | 'tr'
  | 'uk'
  | 'ur'
  | 'vi';

/**
 * The language a mission test **call** is held in — the languages Telnyx
 * `deepgram/flux` accepts on the AI Assistant: one language, or `'multi'`
 * (Flux-multi), which code-switches across the other ten.
 *
 * **Absent means English.**
 *
 * Distinct from `TranscriptionLanguage`, which standard tests and mapping use.
 * The sets are not interchangeable. **The trap: bare `'en'` is valid here and
 * is rejected with a 400 as a transcription language**, which wants a region —
 * `'en-GB'`. Never copy a code from one field to the other.
 *
 * Source of truth: the `CallLanguage` schema in the API's OpenAPI document,
 * which mirrors `api/packages/schemas/entities/callLanguage.ts`.
 */
export type CallLanguage =
  | 'en'
  | 'multi'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'hi'
  | 'ru'
  | 'ja';
