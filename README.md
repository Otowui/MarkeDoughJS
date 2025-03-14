# OtoForms2

## Overview

Markedough.js is an advanced enhancement layer for Marketo Forms, providing additional customization, validation, tracking, and styling capabilities. It allows you to easily extend Marketo forms with advanced features such as prefill, custom styles, Google Tag Manager tracking, and email verification.

## Features

* CSS Reset & Custom Styles: Overrides default Marketo styling with customizable stylesheets and inline CSS.
* Prefill with DTO: Automatically fills form fields with data from an external source.
* Form Follow-Up Actions: Redirects users after submission or displays a custom success message.
* Email Validation: Verifies email addresses using an external API before allowing submission.
* Phone Prefixing: Applies country-specific phone formatting.
* Field Manipulation: Hides labels, fields, legends, and checkboxes dynamically.
* Honeypot Spam Protection: Adds an invisible spam-prevention field.
* Google Tag Manager (GTM) Tracking: Pushes form events to GTM's dataLayer.
* Translation Support: Localizes form content dynamically.
* Not You Functionality: allow users to reset their session and enter new information. 
* Replace Tokens : Replaces predefined tokens in form elements with custom html.
* URL Parameters Management : maps URL parameters to hidden form fields with cookies support.
* Deactivation Mode Mode: Deactivate Form and show a custom Message.
* Custom Behaviors : Executes custom JavaScript functions.
* Debugging Mode: Enables detailed logs to troubleshoot forms.

## Installation Guide

Place this embed code where the Marketo form will load and update with your own values (domain, Munchkin Id, form Id)

```html
<!-- Mandatory: Load Marketo Forms2 Library -->
<script src="https://go.domain.com/js/forms2/js/forms2.min.js"></script>

<!-- Optional: Intl Tel Input Library -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.0/build/css/intlTelInput.min.css" integrity="sha256-W18Dj/28Fa1ZXUXqthAhRkw6FMdTbxbCiyLPvYn15IQ=" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.0/build/js/intlTelInputWithUtils.min.js" integrity="sha256-dMZmG3f1Sx/7bKYf23ZP83AX2a0iYI51m0f0uH0veHM=" crossorigin="anonymous"></script>

<!-- Optional: UploadCare Library -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@1/web/uc-file-uploader-regular.min.css"/>
<script type="module">
  import * as UC from 'https://cdn.jsdelivr.net/npm/@uploadcare/file-uploader@1/web/uc-file-uploader-regular.min.js';
  UC.defineComponents(UC);
</script>

<!-- Mandatory: Embed Marketo Form -->
<div class="oto-form">
	<form id="mktoForm_0000" style="display:none;"></form>
</div>

<!-- Mandatory: Load MarkeDough Plugin & Teknkl Helpers -->
<script src="./MarkeDoughJS/libs/teknkl/helpers.min.js"></script>
<script src="./MarkeDoughJS/markedough.min.js"></script>

<!-- Mandatory: Load Marketo Form & Initialize MarkeDough With Your Options -->
<script>
const mktoConfig = {
	domain: "go.domain.com",
	munchkinId: "123-ABC-456",
	formId: 0000,
	formConfig: {
		debug : false
	}
};
MktoForms2.loadForm(`//${mktoConfig.domain}`, mktoConfig.munchkinId, mktoConfig.formId);
OtoForms2.init(mktoConfig.domain, mktoConfig.munchkinId, mktoConfig.formId, mktoConfig.formConfig);
</script>
```

## Configuration Options

### Debugging
Enables console logs for debugging purposes.
* ```debug```: ```true``` (enable) | ```false``` (disable)
```js
// Typical configuration
"debug" : true,
```

### Prefill (DTO)
Automatically fills form fields with data from an external source.
* ```dto```: ```true``` (enable) | ```false``` (disable)
* ```dtoSrc```: The URL of the DTO source.
* ```dtoOriginUrl```: The expected origin of the DTO message.
* ```dtoTargetUrls```: Array of allowed target URLs.
```js
// Typical configuration
"dto" : true,
"dtoSrc" : "https://go.domain.com/dtp.html",
"dtoOriginUrl" : "https://go.domain.com",
"dtoTargetUrls" : ["https://go.domain.com","https://www.domain.com","https://staging.domain.com"],
```

### CSS Reset & Styling
Overrides default Marketo styles with custom styles.
* ```cssReset```:  ```true``` (enable) | ```false``` (disable)
* ```cssStylesheet```: Array of external stylesheet URLs.
* ```cssStyle```: Object defining custom CSS properties. [Full list available here](https://cdn.otowui.com/js/otoforms2/dist/otoforms2.html)
* ```cssInlineStyle```: String containing inline CSS rules.
```js
// Typical configuration
"cssReset" : true,
"cssStylesheet" : ["https://cdn.otowui.com/js/otoforms2/1.0.css"],
"cssStyle": {
	"text-color": "#000000",
	"bg-color": "#FFFFFF",
	"form-space": "30px",
	"elements-margins": "10px",
	...
},
"cssInlineStyle": `.mktoHtmlText hr {margin:0;background-color:#db095b!important;opacity:1;border: 0;}`,
```

### Follow-Up Actions
Defines actions after successful form submission.
* ```followUp```: ```true``` (enable) | ```false``` (disable)
* ```followUpUrl```: Redirects users to the specified URL (```null``` to disable).
* ```followUpMsg```: Displays a custom message instead of redirecting.
```js
// Typical configuration
"followUp" : true,
"followUpUrl" : "https://domain.com/callback.html", // Url or null
"followUpMsg" : `<div class="oto-form-success">
	<h3>Thank You</h3>
	<p>Your registration has been submitted.<br>
	You will receive a confirmation email shortly.</p>
</div>`,
```

### Honeypot
Activate Honeypot protection
* ```honeypot```: Specifies the input field name for the honeypot
```js
// Typical configuration
"honeypot":"nickname",
```

### Custom Checkbox Label
* ```customLabels```: Object of input names as key and html content as value (```null``` to disable).
```js
// Typical configuration
"customLabels": {
	"contactConsent": `<span>Your privacy is important to us. Please review our <a href="https://go.domain.com/privacy-policy.html">privacy policy</a>.</span>`,
	"newsletterConsent": `Subscribe to our <strong>newsletter</strong> for updates.`,
},
```

### Email Validation
Validates email addresses before submission using an external API.
* ```emailVerify```: ```true``` (enable) | ```false``` (disable)
* ```emailVerifyAPI```: Array of Parameters
* ```emailVerifyAPI.fieldName```: Specifies the input field name for the email.
* ```emailVerifyAPI.endpoint```: API URL used for email validation.
* ```emailVerifyAPI.hash```: API key for authentication.
* ```emailVerifyAPI.action```: Object containing validation rules:
* ```emailVerifyAPI.action.checkMX```: ```true``` | ```false``` (checks if the email domain has a valid MX record)
* ```emailVerifyAPI.action.checkCustomBlacklist```: ```true``` | ```false``` (checks against a custom blacklist)
* ```emailVerifyAPI.action.checkFreeEmails```: ```true``` | ```false``` (blocks free email providers like Gmail, Yahoo, etc.)
* ```emailVerifyAPI.action.checkDisposableEmails```: ```true``` | ```false``` (blocks temporary/disposable email services)
* ```emailVerifyAPI.action.checkWhitelist```: ```true``` | ```false``` (allows specific trusted domains)
```js
// Typical configuration
"emailVerify" : true, // true/false/null
"emailVerifyAPI": {
	"fieldName": "Email",
	"endpoint": "https://api.otowui.com/email/v1/public/",
	"hash": "your-api-key",
	"action": {
		"verify": {
			"checkMX": true, // true/false
			"checkCustomBlacklist": true, // true/false
			"checkFreeEmails": true, // true/false
			"checkDisposableEmails": false, // true/false
			"checkWhitelist": true // true/false
		}
	}
}, // Array or null
```

### International Telephone Input
Format and validate phone numbers internationally with https://intl-tel-input.com/.
* ```intlTelInput```: ```true``` (enable) | ```false``` (disable)
* ```intlTelInputFields```: Array of input "tel"
* ```intlTelInputConfig```: Array of Parameters
```js
// Typical configuration
"intlTelInput" : null, // list/api/null
"intlTelInputFields" : ["MobilePhone","Phone"],
"intlTelInputConfig" : {
  "initialCountry":"us",
  "strictMode":true,
  "nationalMode":false,
  "CountrySync":true,
  "CountrySyncSelector":"Country",
  "allowDropdown":true,
  "showFlags":true,
  "separateDialCode":false
},,
```	

### Deactivation Mode
Disables form and displays a custom message.
* ```deactivate```: ```true``` (enable) | ```false``` (disable)
* ```deactivateMessage```: Custom HTML message shown when the form is deactivated.
```js
// Typical configuration
"deactivate" : true,
"deactivateMessage" : `<div id="oto-form-inactive"><p>Registration for this event is now closed.</p></div>`,
```	

### Clear Munchkin Cookie on submission
Clear the Munchkin cookie and the tracking mkt_tok from a form post.
* ```clearMunchkin```: ```true``` (enable) | ```false``` (disable)
```js
// Typical configuration
"clearMunchkin" : true,
```	

### GTM DataLayer Tracking
Pushes form events to Google Tag Manager’s dataLayer.
* ```dataLayerTracking```: ```true``` (enable) | ```false``` (disable)
* ```dataLayerConfig```: Array of Parameters
* ```dataLayerConfig.eventName```: Name of the GTM event.
* ```dataLayerConfig.trackFormReady```: ```true``` | ```false``` (track when the form is ready)
* ```dataLayerConfig.trackValidationSuccess```: ```true``` | ```false``` (track when form validation is successful)
* ```dataLayerConfig.trackSubmission```: ```true``` | ```false``` (track form submission)
* ```dataLayerConfig.additionalData```: Array of Parameters
* ```dataLayerConfig.additionalData.includeReferrer```: ```true``` | ```false``` (include referrer URL in tracking data)
* ```dataLayerConfig.additionalData.includeUserEmail```: Specifies the field name containing the user email for tracking purposes.
* ```dataLayerConfig.additionalData.hashEmail```: ```true``` | ```false``` (hashes the email to ensure privacy compliance, useful for GDPR/CCPA compliance and Google Ads Enhanced Conversions).
```js
// Typical configuration
"dataLayerTracking": true,
"dataLayerConfig": {
	"eventName": "MyFormEvent",
	"trackFormLoad": false,
	"trackFormRender": false,
	"trackFormReady": false,
	"trackValidationSuccess": false,
	"trackSubmission": true,
	"additionalData": {
		"includeReferrer": true,
		"includeUserEmail": "Email",
		"hashEmail": true
	}
}
```

### Hide Elements
Hides specified form elements dynamically.
* ```hideLabels```: Array of input types to hide their labels.
	* Available values: "text", "url", "number", "select", "email", "tel", "date", "checkboxlist", "radiolist", "textarea"
* ```hideLegends```: true, ```true``` (hide) | ```false``` (show) (Hide Fieldset Legends)
* ```hideFields```: Array of input names whose fields should be hidden.
* ```hideFieldsets```: Array of fieldset legend texts to hide.
```js
// Typical configuration
"hideLabels": ["text","url","number","select","email","tel","date","checkboxlist","radiolist","textarea"],
"hideLegends": true,
"hideFields": ["nickname"], // Used to hide Honeypot
"hideFieldsets": ["hidden"],
```

### Remove Marketo Elements
Removes unnecessary default Marketo elements from the form.
* ```removeElems``` : Array of CSS selectors representing elements to remove.
```js
// Typical configuration
"removeElems" : [".mktoOffset", ".mktoClear", ".mktoGutter"],
```

### Not You Functionality
Adds a "Not You?" button to allow users to reset their session and enter new information.
* ```notYou:true```, ```true``` (enable) | ```false``` (disable)
* ```notYouHtml```: Custom HTML for the "Not You?" button and message.
* ```notYouAfterElem```: Defines the element after which the "Not You?" button will be inserted.
```js
// Typical configuration
"notYou":true,
"notYouHtml": `<p>Not you? <a id="not-you-button" href="#">Click here</a></p>`,
"notYouAfterElem": ".oto-form-desc",
```

### Checkboxes Manipulations
Customizes the appearance and behavior of checkbox groups.
* ```checkBoxes```: Defines styles, inline behavior, and selection rules for specific checkbox groups.

Available settings per group:
* ```style```: "round" (circular checkboxes) | "square" (default checkboxes) | ```null``` (no modification)
* ```inline```: ```true``` (display checkboxes inline) | ```false``` (stack checkboxes vertically)
* ```behavior```: "actAsRadio" (forces only one checkbox selection in the group) | ```null``` (default checkbox behavior)
```js
// Typical configuration
"checkBoxes": {
	"myCheckboxListInputName1": {
		"style": "round",
		"inline": false,
		"behavior": null
	},
	"myCheckboxListInputName2": {
		"style": "round",
		"inline": false,
		"behavior": null
	}
}
```

### Radio Button Manipulations
Customizes the appearance and layout of radio button groups.
* ```radios```: Defines styles and inline behavior for specific radio button groups

Available settings per group:
* ```style```: "tabs" (styled as tab buttons) | ```null``` (no modification)
* ```inline```: ```true``` (display radio buttons inline) | ```false``` (stack radio buttons vertically)
```js
// Typical configuration
"radios": {
	"myRadioListInputName": {
		"style": null,
		"inline": true
	}
}
```

### Token Replacement
Replaces predefined tokens in form elements with custom values.
> [!NOTE]
> This may be overridden by the translate options if translation is enabled.

* ```updateTokens```: Defines key-value pairs where placeholders (tokens) are replaced with specified text.
```js
// Typical configuration
"updateTokens": {
	"{{my.CTA Label}}": "Register now!"
}
```

### Google reCAPTCHA
Enables Google reCAPTCHA v3 to prevent bot submissions.
> [!WARNING]
> Google reCAPTCHA has been deprecated, scoring through recaptcha should be used by programs 
ref : https://iluv.marketingops.com/integration-for-marketo-and-google-recaptcha-v3?ref=blog.teknkl.com
ref : https://nation.marketo.com/t5/marketo-whisperer-blogs/application-of-the-captcha-integration/ba-p/336320
* ```recaptcha```: ```true``` (enable) | ```false``` (disable) reCAPTCHA protection.
* ```recaptchaConfig```: Defines the reCAPTCHA settings.
* ```recaptchaConfig.apiKeys```: Your reCAPTCHA site key
* ```recaptchaConfig.recaptchaFinger```: Defines a unique fingerprint identifier for tracking.
* ```recaptchaConfig.action```: Specifies the intended action for reCAPTCHA validation (e.g., "submit").
```js
// Typical configuration
"recaptcha": false,
"recaptchaConfig": {
	"apiKeys": "your-api-key",
	"recaptchaFinger": "reCAPTCHALastUserFingerprint",
	"action": "submit"
}
```

### Translation
Enables automatic translation of form content using JSON-based language files.
* ```translate```: Defines the translation mode. "json" (enable JSON-based translation) | ```null``` (disable translation)
* ```translateJson```: Specifies the configuration for loading translation files.
* ```translateJson.folder```: URL of the folder containing the translation JSON files.
* ```translateJson.langs```: Array of supported languages, corresponding to the ```<html lang="">``` attribute.
```js
// Typical configuration
"translate": "json",
"translateJson": {
	"folder": "https://cdn.otowui.com/js/otoforms2/lang/",
	"langs": ["en", "fr", "es", "de", "it", "zh-hans"]
}
```

### URL Parameters to Hidden Fields
Automatically maps URL parameters to hidden form fields, ensuring that tracking data (e.g., UTM parameters) is captured in form submissions.
* ```urlParamsToHiddenFields```: ```true``` (enable) | ```false``` (disable)
* ```urlParamsToHiddenFieldsConfig```: Configuration for handling URL parameters.
* ```urlParamsToHiddenFieldsConfig.cookiesFirst```: Uses cookie values before falling back to URL parameters.
* ```urlParamsToHiddenFieldsConfig.cookiesFirst.prefix```: Defines the prefix for cookies (e.g., "oto-" means oto-utm_medium).
* ```urlParamsToHiddenFieldsConfig.excludeList```: Array of URL parameters to ignore.
* ```urlParamsToHiddenFieldsConfig.mapping```: Defines how URL parameters should be mapped to form input fields.
```js
// Typical configuration
"urlParamsToHiddenFields": true,
"urlParamsToHiddenFieldsConfig": {
	"cookiesFirst": {
		"prefix": "oto-"
	}, 
	"excludeList": ["aliId"],
	"mapping": { 
		"utm_medium": "uTMMedium", 
		"utm_source": "uTMSource", 
		"utm_content": "uTMContent", 
		"utm_campaign": "uTMCampaign"
	}
}
```

### Custom Behaviors on Form Ready
Executes custom JavaScript functions when the form is ready.
* ```customBehaviorsOnFormReady```: Object containing functions to execute when form is Ready.
```js
// Typical configuration
"customBehaviorsOnFormReady": {
	"myCustomReadyLogic1": (form) => {
		/* Do Your Thing */
	},
	"myCustomReadyLogic2": (form) => {
		/* Do Another Thing */
	}
},
```

### Custom Behaviors on Form Prefill
Executes custom JavaScript functions when the form is ready and data has been returned by the DTO.
* ```customBehaviorsOnFormPrefill```: Object containing functions to execute when form is Ready and data has been returned by the DTO.
```js
// Typical configuration
"customBehaviorsOnFormPrefill": {
	"myCustomPrefillLogic1": (form) => {
		/* Do Your Thing */
	},
	"myCustomPrefillLogic2": (form) => {
		/* Do Another Thing */
	}
},
```

### Custom Behaviors on Form Success
Executes custom JavaScript functions when the form is successfully submitted.
* ```customBehaviorsOnFormSuccess```: Object containing functions to execute when form is successfully submitted.
```js
// Typical configuration
"customBehaviorsOnFormSuccess": {
	"myCustomSuccessLogic1": (form) => {
		/* Do Your Thing */
	},
	"myCustomSuccessLogic2": (form) => {
		/* Do Another Thing */
	}
},
```


<!-- 
> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.
-->
