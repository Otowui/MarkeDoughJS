/**
 * MarkeDough v0.1
 * 
 * (c) Otowui.com / Wisavice.com - All Rights Reserved
**/
class MarkeDough {
	static initializedForms = new Map();

	constructor(mktoDomain, mktoID, formID, options = {}) {
		this.mktoDomain = mktoDomain;
		this.mktoID = mktoID;
		this.formID = formID;
		this.options = options;
		this.form = null;
	}

	/**
	 * Static method to initialize a form without manually creating an instance.
	 */
	static init(mktoDomain, mktoID, formID, options = {}) {
		const formKey = `${mktoDomain}-${mktoID}-${formID}`;
	
		// ✅ Prevent multiple initializations per form
		if (window.__otoFormsLoaded?.has(formKey)) {
			if (options.debug) {
				console.warn(`⚠️ MarkeDough: Form ${formID} is already initialized. Skipping.`);
			}
			return;
		}
	
		// ✅ Mark form as initialized
		window.__otoFormsLoaded = window.__otoFormsLoaded || new Set();
		window.__otoFormsLoaded.add(formKey);
	
		const otoForm = new MarkeDough(mktoDomain, mktoID, formID, options);
		otoForm.init();
		MarkeDough.initializedForms.set(formKey, otoForm);
	}
	
	/**
	 * Initiates the form loading process.
	 */
	init() {
		this.attachMktoEvents();
	}
	
	/**
	 * Attaches event handlers to Marketo Form.
	 */
	attachMktoEvents() {
		if (!window.MktoForms2) {
			console.error("⚠️ MktoForms2 is not available. Retrying...");
			setTimeout(() => this.attachMktoEvents(), 500);
			return;
		}
	
		MktoForms2.whenRendered((form) => {
			if (this.options.debug) {
				console.debug(`✅ Form ${this.formID} is rendered.`);
			}
			this.onFormRendered(form);
		});
	
		MktoForms2.whenReady((form) => {
			if (this.options.debug) {
				console.debug(`✅ Form ${this.formID} is fully loaded.`);
			}
			this.onFormReady(form);
		});
	}
	
	onFormRendered(form) {
		if (this.options.debug) {
			console.debug(`⚡️ Running onFormRendered() modifications on ${this.formID}.`);
		}
	}

	onFormReady(form) {
		this.form = form;
		
		if (this.options.debug) {
			console.debug(`⚡️ Running onFormReady() modifications on ${this.formID}.`);
		}
		
		// Prevent multiple submissions
		this.formSubmitting = false;
		this.formSubmitted = false;
		
		// Remove elements based on options
		this.cleanUpMktoElements(form);
		
		// Run CSS Reset and other visual modifications here
		this.setupCSSReset(form);
		
		// Hide specific fields and fieldsets from options
		this.hideSpecifiedElements(form);
		
		// Add CSS helper classes (adds classes to fieldsets, single checkboxes)
		this.addCssHelpers(form);
		
		// Hide labels based on `hideLabelsFor`
		this.hideLabelsForFields(form);
		
		// Process checkbox options (style, inline, behavior)
		this.processCheckboxOptions();
		
		// Process radios options (style, inline, behavior)
		this.processRadioOptions();
		
		// Replace tokens inside form elements
		this.replaceTokensInForm(form);
		
		// Replace tokens inside form elements
		this.initCustomLabels(form);
		
		// Run number input refactor if enabled
		this.refactorNumberInputs(form);
		if (this.options.dto) {
			// Process Url Params
			this.setupPrefill(form);
		} else {
			// intlTelInput Support
			this.setupUpIntlTelInput(form);
		}
		
		// Process Url Params
		this.processUrlParams(form);
		
		// Translate
		this.applyTranslations(form);
		
		// uploadCare Support
		this.setupUploadCare(form);
		
		// this.injectRecaptchaScript();
		
		// Execute custom behaviors on Form Ready defined in otoFormConfig
		this.executeCustomBehaviorsOnFormReady(form);
		
		// Show Form
		this.showForm(form);
		
		// Check Deactivation (Must be last)
		this.setupDeactivation(form);
		
		// Fire GTM Datalayer Event
		if (this.options.dataLayerConfig.trackFormReady) {
			this.pushToDataLayer(this.options.dataLayerConfig.eventName + "Ready");
		}
		
		if (this.options.clearMunchkin) {
			this.form.addHiddenFields({ 
				_mkt_trk: "",
				mkt_tok: ""
			});
		}
	
		/**
		 * Custom Validation Hook
		 */
		form.onValidate((nativeValid) => {
			if (this.options.debug) {
				console.log(`🚀 Validating form before submission...`);
			}
	
			// 🚀 Prevent Infinite Validation Loop
			if (this.formSubmitting) {
				console.warn("⚠️ Preventing duplicate validation.");
				return;
			}
	
			this.formSubmitting = true; // **Mark validation as in progress**
			form.submittable(false); // 🚨 **Block submission until validation passes**
	
			let validationPromises = [];
			
			// 📞 Format Phone Number Fields Before Submission
			if (this.options.intlTelInput) {
				if (this.options.intlTelInputFields && Array.isArray(this.options.intlTelInputFields)) {
					const formEl = form.getFormElem()[0];
			
					this.options.intlTelInputFields.forEach(fieldName => {
						const field = formEl.querySelector(`[name="${fieldName}"]`);
						
						if (field && field.intlTelInputInstance) {
							const phoneValue = field.intlTelInputInstance.getNumber();
							console.debug(`📞 Formatted Phone Number for ${fieldName}: ${phoneValue}`);
							field.value = phoneValue; // ✅ Store formatted value before submission
						} else {
							console.warn(`⚠️ intlTelInput instance not found for: ${fieldName}`);
						}
					});
				}
			}
	
			// Run Honeypot Validation
			if (this.options.honeypot) {
				validationPromises.push(this.setupHoneypotValidation(form));
			}
	
			// Run Email Validation
			if (this.options.emailVerify) {
				validationPromises.push(this.setupEmailValidation(form));
			}
			
			/* DEPRECATED
			reCAPTCHA Validation (If enabled)
			if (this.options.recaptcha) {
				validationPromises.push(this.setupRecaptchaValidation(form));
			}
			*/
			/**
			 * **Process Validations & Decide Submission**
			 */
			Promise.all(validationPromises)
				.then((results) => {
					const allValid = results.every((isValid) => isValid);
	
					if (!allValid) {
						console.error("⛔ Validation failed. Submission blocked.");
						this.formSubmitting = false; // **Allow reattempt**
						return;
					}
	
					console.log(`✅ Final submittable state: true`);
					form.submittable(true);
	
					// Ensure the form is truly valid before submission
					setTimeout(() => {
						if (form.getFormElem()[0].checkValidity()) {
							if (this.options.debug) {
								console.log("✅ All validations passed, submitting form...");
							}
							form.getFormElem()[0].dispatchEvent(new Event('submit', { bubbles: true }));
						} else {
							console.warn("⚠️ Form still invalid, submission blocked.");
							this.formSubmitting = false;
						}
					}, 100);
				})
				.catch((error) => {
					console.error("⚠️ Validation error:", error);
					form.submittable(false); // Prevent submission on error
					this.formSubmitting = false;
				});
		});
		
		/**
		 * ✅ Ensure intlTelInput values are set before submission
		 */
		form.onSubmit((form) => {
			/*
			if (this.submissionTriggered) {
				console.warn("⚠️ Preventing duplicate submission.");
				return false;
			}
		
			this.submissionTriggered = true; // ✅ Mark submission in progress
		
			if (this.options.intlTelInput) {
				if (this.options.intlTelInputFields && Array.isArray(this.options.intlTelInputFields)) {
					const formEl = form.getFormElem()[0];
		
					this.options.intlTelInputFields.forEach(fieldName => {
						const field = formEl.querySelector(`[name="${fieldName}"]`);
						
						if (field && field.intlTelInputInstance) { 
							const phoneValue = field.intlTelInputInstance.getNumber();
							console.debug(`📞 Internationalized Phone Number for ${fieldName}: ${phoneValue}`);
							field.value = phoneValue; // ✅ Store formatted value before submission
						} else {
							console.warn(`⚠️ intlTelInput instance not found for: ${fieldName}`);
						}
					});
				}
			}
			*/
			if (this.options.clearMunchkin) {
				this.form.vals({ 
					_mkt_trk: "",
					mkt_tok: ""
				});
			}
		
			// 🚀 Reset `submissionTriggered` after a short delay to prevent blocking future attempts
			setTimeout(() => {
				this.submissionTriggered = false;
			}, 500);
		});

		
		
		/**
		 * Handle Successful Submission & Follow-Up Actions
		 */
		form.onSuccess((vals, followUpUrl) => {
			if (this.formSubmitted) {
				console.warn("⚠️ Preventing duplicate success handling.");
				return false; // **Stop duplicate success processing**
			}
	
			this.formSubmitted = true; // **Mark as submitted**
	
			if (this.options.debug) {
				console.log(`🚀 Form submission successful. Handling follow-up...`);
			}
			
			// Execute custom behaviors defined in otoFormConfig
			this.executeCustomBehaviorsOnFormSuccess(form);
	
			// Fire GTM DataLayer Event
			if (this.options.followUp) {
			
				if (this.options.followUpUrl) {
					console.log(`🔗 Redirecting to follow-up URL: ${this.options.followUpUrl}`);
					setTimeout(() => {
						window.location.href = this.options.followUpUrl;
					}, 500); // **Small delay ensures Marketo completes processing**
					return false; // **Prevent Marketo default redirection**
				}
				
				if (this.options.followUpMsg) {
					const formEl = form.getFormElem()[0];
					formEl.style.display = "none";
		
					const messageContainer = document.createElement("div");
					messageContainer.innerHTML = this.options.followUpMsg;
					formEl.parentElement.appendChild(messageContainer);
		
					console.log("Displayed follow-up message instead of redirection.");
					return false; // **Prevent redirection**
				}
			} else {
				return true; // **Default: Let Marketo handle it**
			}
			
		});
	}

	
	/**
	 * Hides the Marketo form on load.
	 * @param {Object} form - The Marketo form instance.
	*/
	hideForm(form) {
		const formEl = form.getFormElem()[0];
		formEl.style.display = "none";
		
		if (this.options.debug) {
			console.debug(`Form ${this.formID} is now hidden.`);
		}
	}
	
	/**
	 * Shows the Marketo form when it is fully loaded.
	 * @param {Object} form - The Marketo form instance.
	 */
	showForm(form) {
		const formEl = form.getFormElem()[0];
		formEl.style.display = "";
		
		if (formEl.parentElement) {
			formEl.parentElement.style.removeProperty("display");
		}
	
		if (this.options.debug) {
			console.debug(`Form ${this.formID} is now visible.`);
		}
	}

	/**
	 * Removes Marketo styles, inline styles, and resets form appearance.
	 * @param {Object} form - The Marketo form instance.
	 */
	setupCSSReset(form) {
		if (!this.options.cssReset) return;

		const formEl = form.getFormElem()[0];

		// Remove inline styles
		this.removeInlineStyles(formEl);

		// Disable Marketo stylesheets
		this.disableMarketoStyles(formEl);
		
		// Remove embedded <style> tags inside the form
		this.removeEmbeddedStyles(formEl);
		
		// Remove all `.mktoHasWidth` classes inside the form
		this.removeMktoHasWidth(formEl);

		// inject custom stylesheet
		this.injectStylesheet();
		
		// Set a marker attribute if additional styles are disabled
		if (!this.options.moreStyles) {
			formEl.setAttribute("data-style", "oto");
		}
		
		// Start MutationObserver to prevent Marketo from injecting `style="width:"`
		this.observeMktoFormStyles(formEl);
		
		if (this.options.debug) {
			console.debug(`CSS Reset applied to Form ${this.formID}`);
		}
	}
	
	/**
	 * Injects user-defined stylesheets and CSS variables.
	 */
	injectStylesheet() {
		if (!this.options.cssStylesheet && !this.options.cssStyle && !this.options.cssInlineStyle) return;
	
		// Inject CSS Variables & Inline Styles if either is present
		if (
			(this.options.cssStyle && Object.keys(this.options.cssStyle).length > 0) || 
			(this.options.cssInlineStyle && this.options.cssInlineStyle.trim() !== "")
		) {
			this.injectCSSVariables();
		}
	
		// Inject external stylesheets if provided
		if (Array.isArray(this.options.cssStylesheet)) {
			this.options.cssStylesheet.forEach(stylesheet => {
				if (!document.querySelector(`link[href="${stylesheet}"]`)) {
					const link = document.createElement("link");
					link.rel = "stylesheet";
					link.href = stylesheet;
					document.head.appendChild(link);
	
					if (this.options.debug) {
						console.log(`Applied external CSS: ${stylesheet}`);
					}
				}
			});
		}
	}
	
	/**
	 * Injects CSS variables from `cssStyle` into a `<style>` tag in the head.
	 * Also appends `cssInlineStyle` if provided.
	 */
	injectCSSVariables() {
		const existingStyleTag = document.getElementById("otoFormCustomStyles");
		if (existingStyleTag) return; // Prevent duplicate injections
	
		let cssContent = ":root {\n";
		// Inject CSS Variables
		if (this.options.cssStyle && Object.keys(this.options.cssStyle).length > 0) {
			for (const [key, value] of Object.entries(this.options.cssStyle)) {
				cssContent += `  --otoform-${key}: ${value};\n`;
			}
		}
		cssContent += "}";
	
		// Append Inline CSS from `cssInlineStyle`
		if (this.options.cssInlineStyle && typeof this.options.cssInlineStyle === "string" && this.options.cssInlineStyle.trim() !== "") {
			cssContent += `\n${this.options.cssInlineStyle}`;
		}
	
		// Create and inject style tag
		const styleTag = document.createElement("style");
		styleTag.id = "otoFormCustomStyles";
		styleTag.textContent = cssContent;
		document.head.appendChild(styleTag);
	
		if (this.options.debug) {
			console.log(`Injected CSS Variables & Inline Styles:`, { variables: this.options.cssStyle, inlineStyles: this.options.cssInlineStyle });
		}
	}
	
	/**
	 * Removes embedded <style> tags inside the form element.
	 * @param {HTMLElement} formEl - The Marketo form element.
	 */
	removeEmbeddedStyles(formEl) {
		const styleTags = formEl.querySelectorAll("style");
		styleTags.forEach(styleTag => styleTag.remove());
	
		if (this.options.debug) {
			console.debug(`Removed ${styleTags.length} embedded <style> tags inside the form.`);
		}
	}

	/**
	 * Removes inline styles from the Marketo form, except for elements inside `.mktoHtmlText`.
	 * However, it still removes inline styles from `.mktoHtmlText` itself.
	 * 
	 * @param {HTMLElement} formEl - The Marketo form element.
	 */
	removeInlineStyles(formEl) {
		const styledEls = Array.from(formEl.querySelectorAll("[style]"));
	
		styledEls.forEach(el => {
			// If the element is inside `.mktoHtmlText`, DO NOT remove styles.
			if (el.closest(".mktoHtmlText") && !el.classList.contains("mktoHtmlText")) return;
	
			// Remove the style attribute.
			el.removeAttribute("style");
		});
	
		// Also check the form element itself, unless it's inside `.mktoHtmlText`
		if (!formEl.closest(".mktoHtmlText")) {
			formEl.removeAttribute("style");
		}
	}
	
	/**
	 * Removes all instances of `.mktoHasWidth` inside the form,
	 * including the <form> element itself.
	 * @param {HTMLElement} formEl - The Marketo form element.
	 */
	removeMktoHasWidth(formEl) {
		// Target all elements with `.mktoHasWidth` inside the form
		const elements = formEl.querySelectorAll(".mktoHasWidth");
	
		// Also check if the <form> itself has `.mktoHasWidth`
		if (formEl.classList.contains("mktoHasWidth")) {
			formEl.classList.remove("mktoHasWidth");
		}
	
		// Remove `.mktoHasWidth` from all matching elements inside the form
		elements.forEach(el => el.classList.remove("mktoHasWidth"));
	
		if (this.options.debug) {
			console.debug(`Removed .mktoHasWidth from ${elements.length + (formEl.classList.contains("mktoHasWidth") ? 1 : 0)} elements.`);
		}
	}

	/**
	 * Disables Marketo stylesheets and any styles inside the form.
	 * @param {HTMLElement} formEl - The Marketo form element.
	 */
	disableMarketoStyles(formEl) {
		try {
			const styleSheets = Array.from(document.styleSheets);

			styleSheets.forEach((ss) => {
				try {
					// Disable styles if owned by Marketo or injected within the form
					if (
						ss.href && ss.href.includes("forms2") ||  // Marketo default styles
						formEl.contains(ss.ownerNode)            // Any styles inside the form
					) {
						ss.disabled = true;
					}
				} catch (e) {
					// Prevent cross-origin errors from breaking execution
					if (this.options.debug) {
						console.warn(`⚠️ Could not access stylesheet:`, e);
					}
				}
			});
		} catch (e) {
			if (this.options.debug) {
				console.warn(`⚠️ Error disabling Marketo styles:`, e);
			}
		}
	}
	
	/**
	 * Enhances form styling by adding CSS helper classes.
	 * - Ensures `.mktoFormRow` classes contain unique field names (no duplicates).
	 * - Uses the `name` attribute instead of `id` for checkbox lists and radio lists.
	 * - Prevents `.otoform-col-*` (field-based classes) from being added to `<fieldset>`.
	 * - Ensures checkbox/radio lists add `name` only once.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	addCssHelpers(form) {
		if (!this.options.cssReset) return; // Skip if CSS Reset is disabled
	
		const formEl = form.getFormElem()[0];
	
		// Process Fieldsets (Field-based classes are NOT added to fieldsets)
		formEl.querySelectorAll("fieldset").forEach(fieldset => {
			const legend = fieldset.querySelector("legend");
			if (!legend || !legend.textContent.trim()) return;
	
			const slug = this.slugify(legend.textContent.trim());
			const parentRow = fieldset.closest(".mktoFormRow");
			const parentCol = fieldset.closest(".mktoFormCol");
	
			if (parentRow) {
				parentRow.classList.add(`otoform-row-fieldset-${slug}`);
			}
			if (parentCol) {
				parentCol.classList.add(`otoform-col-fieldset-${slug}`);
			}
	
			if (this.options.debug) {
				console.log(`Added fieldset class "otoform-row-fieldset-${slug}"`);
			}
		});
	
		// Process Form Rows (Ensuring unique field names, no duplicates)
		formEl.querySelectorAll(".mktoFormRow").forEach(row => {
			// Skip fieldset parents
			if (row.querySelector("fieldset")) return;
	
			const fields = row.querySelectorAll("input, select, textarea");
			const fieldNames = new Set([...fields].map(field => this.slugify(field.name || "")));
	
			if (fieldNames.size) {
				row.classList.add(`otoform-row-${[...fieldNames].join("-")}`);
				if (this.options.debug) {
					console.log(`Added class "otoform-row-${[...fieldNames].join("-")}" to row.`);
				}
			}
		});
	
		// Process Form Columns (Using `name` for unique field-based classes, but NOT fieldsets)
		formEl.querySelectorAll(".mktoFormCol").forEach(col => {
			// **Skip fieldsets**, only process direct `.mktoFormCol` elements
			if (col.tagName.toLowerCase() === "fieldset") return;
	
			const field = col.querySelector("input, select, textarea");
			if (field) {
				const fieldName = this.slugify(field.name || "");
				if (fieldName) {
					col.classList.add(`otoform-col-${fieldName}`);
					if (this.options.debug) {
						console.log(`Added class "otoform-col-${fieldName}" to column.`);
					}
				}
			}
		});
	
		// Process Field Wrappers (Using `name` for unique field-based classes)
		formEl.querySelectorAll(".mktoFieldWrap").forEach(wrapper => {
			const field = wrapper.querySelector("input, select, textarea");
			if (field) {
				const fieldName = this.slugify(field.name || "");
				if (fieldName) {
					wrapper.classList.add(`otoform-field-${fieldName}`);
					if (this.options.debug) {
						console.log(`Added class "otoform-field-${fieldName}" to field wrapper.`);
					}
				}
			}
		});
	
		// Process Checkbox Lists (Use `name` instead of `id`, and avoid duplicates)
		formEl.querySelectorAll(".mktoCheckboxList").forEach(checkboxList => {
			const input = checkboxList.querySelector("input[type='checkbox']");
			if (input) {
				const fieldName = this.slugify(input.name || "");
				if (fieldName) {
					checkboxList.classList.add(`otoform-checkboxlist-${fieldName}`);
					if (this.options.debug) {
						console.log(`Added class "otoform-checkboxlist-${fieldName}" to checkbox list.`);
					}
				}
			}
		});
	
		// Process Radio Lists (Use `name` instead of `id`, and avoid duplicates)
		formEl.querySelectorAll(".mktoRadioList").forEach(radioList => {
			const input = radioList.querySelector("input[type='radio']");
			if (input) {
				const fieldName = this.slugify(input.name || "");
				if (fieldName) {
					radioList.classList.add(`otoform-radiolist-${fieldName}`);
					if (this.options.debug) {
						console.log(`Added class "otoform-radiolist-${fieldName}" to radio list.`);
					}
				}
			}
		});
	
		// Detect Single Checkboxes
		formEl.querySelectorAll('.mktoCheckboxList').forEach(checkboxList => {
			const labels = checkboxList.querySelectorAll('label');
			const isBothEmptyAndNoHTML = Array.from(labels).some(el =>
				el.textContent.trim() === "" && el.innerHTML.trim() === ""
			);
	
			if (isBothEmptyAndNoHTML) {
				const fieldWrap = checkboxList.closest('.mktoFieldWrap');
				if (fieldWrap) {
					fieldWrap.classList.add("otoform-single-checkbox");
	
					if (this.options.debug) {
						console.log(`Added class "otoform-single-checkbox" to field wrap.`);
					}
				}
			}
		});
	
		if (this.options.debug) {
			console.log("CSS helpers added to form.");
		}
	}
	
	/**
	 * Watches the form element for any added inline styles and removes `style="width: ..."`
	 * @param {HTMLElement} formEl - The Marketo form element.
	 */
	observeMktoFormStyles(formEl) {
		// Create a MutationObserver instance
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (mutation.attributeName === "style") {
					if (formEl.style.width) {
						formEl.style.removeProperty("width");
	
						if (this.options.debug) {
							console.debug(`Removed inline width style from .mktoForm`);
						}
					}
				}
			});
		});
	
		// Start observing `style` attribute changes on `.mktoForm`
		observer.observe(formEl, {
			attributes: true, // Watch for attribute changes
			attributeFilter: ["style"] // Only observe the `style` attribute
		});
	
		if (this.options.debug) {
			console.debug(`MutationObserver started to prevent Marketo from injecting inline width.`);
		}
		
		
		
	}
	
	/**
	 * Add Support for IntlTelInput
	 * @param {Object} form - The Marketo form instance.
	 */
	/**
	 * Add Support for IntlTelInput
	 * @param {Object} form - The Marketo form instance.
	 */
	setupUpIntlTelInput(form) {
		if (!this.options.intlTelInput) return;
		if (typeof window.intlTelInput !== 'function') {
			if (this.options.debug) {
			console.error("intlTelInput library not loaded.");
			}
			return;
		}
		
		const formEl = form.getFormElem()[0];
		const configOptions = this.options.intlTelInputConfig || {};
		
		// Helper to convert "1" to true
		const toBool = (val) => (val === "1" || val === 1 || val === true);
		
		const config = {
			initialCountry: configOptions.initialCountry || "auto",
			strictMode: toBool(configOptions.strictMode),
			nationalMode: toBool(configOptions.nationalMode),
			geoIpLookup: toBool(configOptions.geoIpLookup)
			? function(callback) {
				fetch(configOptions.geoIpLookupApi || "https://ipinfo.io/json?token=InsertApiKeyHere")
					.then(response => response.json())
					.then(data => {
					callback(data[configOptions.geoIpLookupApiResponseKey] || configOptions.geoIpLookupApiResponseFallback || "us");
					})
					.catch(() => {
					callback(configOptions.geoIpLookupApiResponseFallback || "us");
					});
				}
			: null,
			allowDropdown: toBool(configOptions.allowDropdown),
			showFlags: toBool(configOptions.showFlags),
			separateDialCode: toBool(configOptions.separateDialCode)
		};
		
		if (this.options.debug) {
			console.log("IntlTelInput configuration:", config);
		}
		
		// Initialize intlTelInput on each specified field.
		if (this.options.intlTelInputFields && Array.isArray(this.options.intlTelInputFields)) {
			this.options.intlTelInputFields.forEach(fieldName => {
			const field = formEl.querySelector(`[name="${fieldName}"]`);
			if (field) {
				field.intlTelInputInstance = window.intlTelInput(field, config);
				if (this.options.debug) {
				console.log(`intlTelInput initialized for field: ${fieldName}`);
				}
			} else if (this.options.debug) {
				console.warn(`Field not found for intlTelInput: ${fieldName}`);
			}
			});
		}
		
		// Country Sync functionality.
		if (configOptions.CountrySync && configOptions.CountrySyncSelector) {
			const countrySyncSelect = formEl.querySelector(`[name="${configOptions.CountrySyncSelector}"]`);
			if (countrySyncSelect) {
			// Populate the select with country data.
			const countryData = window.intlTelInput.getCountryData();
			countrySyncSelect.innerHTML = "";
			countryData.forEach(country => {
				const option = document.createElement("option");
				option.value = country.iso2;
				option.text = country.name;
				countrySyncSelect.appendChild(option);
			});
			
			// Use the first phone field (from intlTelInputFields) for syncing.
			const phoneFieldName = this.options.intlTelInputFields[0];
			const phoneField = formEl.querySelector(`[name="${phoneFieldName}"]`);
			if (phoneField && phoneField.intlTelInputInstance) {
				const iti = phoneField.intlTelInputInstance;
				countrySyncSelect.value = iti.getSelectedCountryData().iso2;
				phoneField.addEventListener('countrychange', () => {
				countrySyncSelect.value = iti.getSelectedCountryData().iso2;
				});
				countrySyncSelect.addEventListener('change', () => {
				iti.setCountry(countrySyncSelect.value);
				});
			}
			} else if (this.options.debug) {
			console.warn(`Country Sync Selector element not found: ${configOptions.CountrySyncSelector}`);
			}
		}
	}


	/**
	 * Add Support for UploadCare & pass uploaded files urls to a textarea
	 * @param {Object} form - The Marketo form instance.
	 */
	setupUploadCare(form){
		if (!this.options.uploadCare) return;
		
		if (this.options.debug) {
			console.log("⚡️ Setting up UploadCare");
		}
		
		const formEl = form.getFormElem()[0];
		
		if (this.options.uploadCareTarget) {
			
			function decodeHTMLEntities(text) {
			  var textarea = document.createElement("textarea");
			  textarea.innerHTML = text;
			  return textarea.value;
			}
			const fieldName = this.options.uploadCareTarget; // field name
			const ucConfig = decodeHTMLEntities(this.options.uploadCareConfig); // field name
			
			
			let hiddenInput = formEl.querySelector(`[name="${fieldName}"]`);
			//let targetFieldHide = hiddenInput?.closest(".mktoFormCol");
			hiddenInput.classList.add("oto-visually-hidden");
			
			
			let normalizeSpaceTarget = hiddenInput?.closest(".mktoFieldWrap");
			normalizeSpaceTarget.classList.add("oto-force-space-bottom");
			
			// Prevent duplicate Uploadcare elements
			if (!document.querySelector("uc-file-uploader-minimal") || !document.querySelector("uc-file-uploader-regular")) {
				const uploadContainer = document.createElement("div");
				uploadContainer.classList.add("mktoFormRow");
				uploadContainer.classList.add("otoform-row-uploadcare");
				uploadContainer.innerHTML = `${ucConfig}<uc-upload-ctx-provider ctx-name="my-uploader"></uc-upload-ctx-provider>`;
				
				// Append the Uploadcare widget inside the correct Marketo form row
				const targetFieldRow = formEl.querySelector(`[name="${fieldName}"]`)?.closest(".mktoFormRow");
				if (targetFieldRow) {
					targetFieldRow.insertAdjacentElement("afterend", uploadContainer);
				} else {
					formEl.insertAdjacentElement("afterend", uploadContainer);
				}
			}
			
			// Get the Uploadcare context provider element
			const uploadCareCtx = document.querySelector("uc-upload-ctx-provider[ctx-name='my-uploader']");
			
			if (!uploadCareCtx) {
			  console.error("Uploadcare context provider element not found!");
			  return;
			}
			
			// Capture successful uploads
			uploadCareCtx.addEventListener("common-upload-success", (event) => {
				const uploadedFiles = event.detail.successEntries; // Array of uploaded files
				if (!uploadedFiles || uploadedFiles.length === 0) return;
			
				// Extract the CDN URLs
				const uploadedFileUrls = uploadedFiles.map(file => file.cdnUrl);
				console.log("Files Uploaded:", uploadedFileUrls);
			
				// Store all file URLs as a comma-separated list in the textarea
				hiddenInput.value = uploadedFileUrls.join(", ");
			});
			
			// Capture file URL change event
			/*
			uploadCareCtx.addEventListener("file-url-changed", (event) => {
				const uploadedFileUrl = event.detail.cdnUrl;
				const uploadedFileUrls = event.detail.urls; // URLs array for multiple files
				console.log("File URL Changed:", uploadedFileUrl);
				console.log("Files URLs Changed:", uploadedFileUrls);
				
				// Store the uploaded file URL in the hidden input
				// hiddenInput.value = uploadedFileUrl;
				
				// Store the uploaded files URLs in the hidden texarea
				hiddenInput.value = uploadedFileUrls.join(", ");
			});
			*/
			

		}
		
	}
	
	/**
	 * Hides the form if `deactivate` is set to `true` and replaces it with `deactivateMessage`.
	 * @param {Object} form - The Marketo form instance.
	 */
	setupDeactivation(form) {
		if (!this.options.deactivate) return;
	
		const formEl = form.getFormElem()[0];
		const parentEl = formEl.parentElement;
	
		// Hide the form
		formEl.style.display = "none";
	
		// Inject deactivation message
		if (this.options.deactivateMessage) {
			const messageContainer = document.createElement("div");
			messageContainer.innerHTML = this.options.deactivateMessage;
			parentEl.appendChild(messageContainer);
		}
	
		if (this.options.debug) {
			console.debug(`Form ${this.formID} is deactivated and replaced with a message.`);
		}
	}
	
	/**
	 * Handles form pre-filling using SimpleDTO.
	 * @param {Object} form - The Marketo form instance.
	 */
	setupPrefill(form) {
		if (!this.options.dto) return;
	
		const dtoSrc = this.options.dtoSrc;
		const dtoOriginUrl = this.options.dtoOriginUrl;
		const dtoTargetUrls = this.options.dtoTargetUrls;
	
		if (!dtoSrc || !dtoOriginUrl || !dtoTargetUrls || !Array.isArray(dtoTargetUrls)) {
			if (this.options.debug) {
				console.warn("⚠️ DTO configuration is incomplete. Prefill aborted.");
			}
			return;
		}
	
		if (this.options.debug) {
			console.log("Initializing SimpleDTO for form prefill...");
		}
	
		const DTO = new SimpleDTO({
			debug: this.options.debug,
			mode: "receive",
			transport: "message",
			messageSource: dtoOriginUrl,
			messageTarget: dtoTargetUrls,
			dataSrc: dtoSrc,
			cb: (instance, mktoFields) => {
				if (this.options.debug) {
					console.debug("🗂️ Marketo Fields received:", mktoFields);
				}
	
				// Apply the prefilled data to the Marketo form
				form.setValuesCoerced(mktoFields);
	
				// Trigger lead actions callback after prefill
				this.onPrefillReadyTriggerLeadActions(form,mktoFields);
	
				// Cleanup DTO instance
				DTO.cleanup();
			}
		});
	}
	
	/**
	 * Callback function triggered after DTO prefill is applied.
	 * @param {Object} mktoFields - The prefilled Marketo form fields.
	 */
	onPrefillReadyTriggerLeadActions(form,mktoFields) {
		if (this.options.debug) {
			console.log("⚡️Lead actions triggered after DTO prefill");
		}
		
		// intlTelInput Support
		this.setupUpIntlTelInput(form);
		
		// Execute custom behaviors defined in otoFormConfig
		this.executeCustomBehaviorsOnFormPrefill(form);
	
		// 🚀 Future implementations go here:
		
		// Run "Not You?" functionality if email is prefilled and `notYou` is enabled
		if (this.options.notYou && mktoFields.Email) {
			this.setupNotYouButton();
		}
	}
	
	/**
	 * Validates the email field using an external API before allowing form submission.
	 *
	 * @param {Object} form - The Marketo form instance.
	 * @returns {Promise<boolean>} - Resolves `true` if the email is valid, `false` otherwise.
	 */
	setupEmailValidation(form) {
		return new Promise((resolve) => {
			if (!this.options.emailVerify || !this.options.emailVerifyAPI) {
				return resolve(true); // Skip validation if not enabled
			}
	
			const config = this.options.emailVerifyAPI;
			const emailField = config.fieldName || "Email";
			const emailEl = form.getFormElem()[0].querySelector(`[name="${emailField}"]`);
	
			if (!emailEl) {
				if (this.options.debug) {
					console.warn(`⚠️ Email field not found: ${emailField}`);
				}
				return resolve(true);
			}
	
			if (!emailEl.value || !emailEl.value.includes("@") || !emailEl.value.includes(".")) {
				this.markInvalid(emailEl, "Invalid email format.");
				return resolve(false);
			}
	
			const self = this;
			const actionKey = Object.keys(config.action)[0] || "verify";
			const actionParams = config.action[actionKey] || {};
	
			const apiParamMapping = {
				checkMX: "checkmx",
				checkCustomBlacklist: "checkblacklist",
				checkFreeEmails: "checkfreelist",
				checkDisposableEmails: "checkdisposablelist",
				checkWhitelist: "checkwhitelist",
			};
	
			const actionQueryString = Object.entries(actionParams)
				.filter(([key, val]) => apiParamMapping[key] !== undefined && typeof val === "boolean")
				.map(([key, val]) => `${apiParamMapping[key]}=${val ? "true" : "false"}`)
				.join("&");
	
			const apiUrl = `${config.endpoint}?key=${config.hash}&action=${actionKey}&${actionQueryString}&eml=${encodeURIComponent(emailEl.value)}`;
	
			const xhr = new XMLHttpRequest();
			xhr.open("GET", apiUrl, true);
			xhr.responseType = "json";
	
			xhr.onload = function () {
				if (xhr.status === 200) {
					const jsonResponse = xhr.response;
					console.debug(`🚀 Email Validation API Response: ${JSON.stringify(jsonResponse, null, 2)}`);
	
					if (jsonResponse && Array.isArray(jsonResponse) && jsonResponse.length > 0) {
						const firstResponse = jsonResponse[0];
	
						if (firstResponse.valid === "1") {
							form.submittable(true);
							self.markValid(emailEl);
							resolve(true);
						} else {
							console.error(`🚨 Invalid Email Detected: ${firstResponse.msg}`);
							form.submittable(false);
							self.markInvalid(emailEl, firstResponse.msg);
							resolve(false);
						}
					} else {
						console.error("⚠️ Invalid API response format:", jsonResponse);
						resolve(true);
					}
				} else {
					console.error("⚠️ Validation API error:", xhr.status, xhr.statusText);
					resolve(true);
				}
			};
	
			xhr.onerror = function () {
				console.error("⚠️ Network error during email validation.");
				resolve(true);
			};
	
			xhr.send();
		});
	}

	/**
	 * Process API validation
	 *
	 * @param {HTMLElement} emailEl - The input field element.
	 * @param {Object} form - The Marketo form instance.
	 */
	validateEmailField(emailEl, form) {
		return new Promise((resolve) => {
			if (!emailEl.value || !emailEl.value.includes("@") || !emailEl.value.includes(".")) {
				this.markInvalid(emailEl, "Invalid email format.");
				form.submittable(false); // ⛔ Block submission
				return resolve(false);
			}
	
			const self = this;
			const config = this.options.emailVerifyAPI;
			const actionKey = Object.keys(config.action)[0] || "verify";
			const actionParams = config.action[actionKey] || {};
	
			const apiParamMapping = {
				checkMX: "checkmx",
				checkCustomBlacklist: "checkblacklist",
				checkFreeEmails: "checkfreelist",
				checkDisposableEmails: "checkdisposablelist",
				checkWhitelist: "checkwhitelist",
			};
	
			const actionQueryString = Object.entries(actionParams)
				.filter(([key, val]) => apiParamMapping[key] !== undefined && typeof val === "boolean")
				.map(([key, val]) => `${apiParamMapping[key]}=${val ? "true" : "false"}`)
				.join("&");
	
			const apiUrl = `${config.endpoint}?key=${config.hash}&action=${actionKey}&${actionQueryString}&eml=${encodeURIComponent(emailEl.value)}`;
	
			const xhr = new XMLHttpRequest();
			xhr.open("GET", apiUrl, true);
			xhr.responseType = "json";
	
			xhr.onload = function () {
				if (xhr.status === 200) {
					let jsonResponse;
	
					try {
						jsonResponse = xhr.response;
					} catch (error) {
						console.error("❌ JSON Parsing Error:", error);
						form.submittable(false); // ⛔ Block submission
						return resolve(false);
					}
	
					console.debug("🚀 Email Validation API Response:", JSON.stringify(jsonResponse, null, 2));
	
					if (jsonResponse && Array.isArray(jsonResponse) && jsonResponse.length > 0) {
						const firstResponse = jsonResponse[0];
	
						if (firstResponse.valid === "1") {
							self.markValid(emailEl);
							form.submittable(true); // ✅ Allow submission
							resolve(true);
						} else {
							console.warn("🚨 Invalid Email Detected:", firstResponse.msg);
							self.markInvalid(emailEl, firstResponse.msg || "Please enter a valid company email.");
							form.submittable(false); // ⛔ Explicitly block submission
							resolve(false);
						}
					} else {
						console.error("❌ Unexpected API Response Format:", jsonResponse);
						form.submittable(false); // ⛔ Block submission if response is unexpected
						resolve(false);
					}
				} else {
					console.error("❌ API Request Failed:", xhr.status, xhr.statusText);
					form.submittable(false); // ⛔ Block submission
					resolve(false);
				}
			};
	
			xhr.onerror = function () {
				console.error("❌ Network Error During Email Validation.");
				form.submittable(false); // ⛔ Block submission
				resolve(false);
			};
	
			xhr.send();
		});
	}
	
	/**
	 * Removes error messages with a fade-out effect when clicking any form input.
	 */
	setupErrorHideEvents() {
		const formEl = document.querySelector(".mktoForm");
		if (!formEl) return;
	
		const hideErrors = () => {
			const errorDivs = formEl.querySelectorAll(".mktoError");
			errorDivs.forEach(errorDiv => {
				errorDiv.style.opacity = "0"; // Fade out
				setTimeout(() => errorDiv.remove(), 300); // Remove after transition
			});
	
			// Remove the `customInvalid` class from all inputs
			formEl.querySelectorAll(".customInvalid").forEach(input => {
				input.classList.remove("customInvalid", "mktoInvalid");
			});
	
			// Remove event listener after execution to prevent unnecessary calls
			formEl.removeEventListener("click", hideErrors);
		};
	
		formEl.addEventListener("click", hideErrors);
	}

	/**
	 * Marks a field as valid by applying success styles and removing any error messages.
	 *
	 * @param {HTMLElement} el - The input field to mark as valid.
	 */
	markValid(el) {
		el.classList.remove("customInvalid", "mktoInvalid");
		el.classList.add("mktoValid");
		el.setAttribute("aria-invalid", "false");
	
		// Remove any existing error messages
		MktoForms2.$(el).siblings(".mktoError").remove();
	
		if (this.options.debug) {
			console.log(`Validation passed for ${el.name}`);
		}
	}
	
	/**
	 * Marks an input field as invalid, appending a styled error message with a fade-in effect.
	 *
	 * @param {HTMLElement} el - The input field element.
	 * @param {string} message - The error message to display.
	 */
	markInvalid(el, message) {
		el.classList.add("customInvalid", "mktoInvalid");
		el.classList.remove("mktoValid");
		el.setAttribute("aria-invalid", "true");
	
		// Remove any existing error messages
		const existingError = el.parentElement.querySelector(".mktoError");
		if (existingError) {
			existingError.remove();
		}
	
		// Create the error container
		const errorDiv = document.createElement("div");
		errorDiv.classList.add("mktoError");
		errorDiv.style.opacity = "0"; // Start hidden for fade-in effect
		errorDiv.style.transition = "opacity 0.3s ease-in-out"; // Smooth fade transition
	
		// Create the error arrow wrapper
		const arrowWrap = document.createElement("div");
		arrowWrap.classList.add("mktoErrorArrowWrap");
	
		// Create the error arrow
		const arrow = document.createElement("div");
		arrow.classList.add("mktoErrorArrow");
	
		// Create the error message
		const errorMsg = document.createElement("div");
		errorMsg.classList.add("mktoErrorMsg");
		errorMsg.setAttribute("id", "ValidMsgTitle");
		errorMsg.setAttribute("role", "alert");
		errorMsg.setAttribute("tabindex", "-1");
		errorMsg.textContent = message;
	
		// Append elements together
		arrowWrap.appendChild(arrow);
		errorDiv.appendChild(arrowWrap);
		errorDiv.appendChild(errorMsg);
	
		// Insert the error message after the input element
		el.parentElement.appendChild(errorDiv);
	
		// ✅ Use requestAnimationFrame to ensure the error width is calculated AFTER rendering
		requestAnimationFrame(() => {
			const inputRect = el.getBoundingClientRect();
			const errorRect = errorDiv.getBoundingClientRect();
	
			// ✅ Position the error message relative to the input
			errorDiv.style.position = "absolute";
			errorDiv.style.top = `${el.offsetTop + el.offsetHeight + 5}px`;
			errorDiv.style.left = `${el.offsetLeft + el.offsetWidth / 2}px`;
			errorDiv.style.transform = "translateX(-50%)"; // ✅ Ensures perfect centering
			errorDiv.style.zIndex = "10"; // Ensure it's above other elements
	
			// ✅ Fade-in effect
			requestAnimationFrame(() => {
				errorDiv.style.opacity = "1";
			});
	
			if (this.options.debug) {
				console.warn(`Validation failed: ${message}`);
			}
		});
	
		// ✅ Always attach error removal events (even if Marketo handles some errors)
		this.setupErrorHideEvents();
	}
	
	/**
	 * Hides specific form fields (`hideFields`) and fieldsets (`hideFieldset`)
	 * by adding the `.visually-hidden` class to their `.mktoFormRow` container.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	hideSpecifiedElements(form) {
		const formEl = form.getFormElem()[0];
	
		// Hide fields based on input `name`
		if (this.options.hideFields && Array.isArray(this.options.hideFields)) {
			this.options.hideFields.forEach(fieldName => {
				const field = formEl.querySelector(`[name="${fieldName}"]`);
				if (field) {
					const row = field.closest(".mktoFormRow");
					if (row) {
						row.classList.add("oto-hidden");
	
						if (this.options.debug) {
							console.log(`⚡️ Hiding row for field: ${fieldName}`);
						}
					}
				} else if (this.options.debug) {
					console.warn(`Field not found for hiding: ${fieldName}`);
				}
			});
		}
	
		// Hide fieldsets based on `<legend>` text content
		if (this.options.hideFieldsets && Array.isArray(this.options.hideFieldsets)) {
			this.options.hideFieldsets.forEach(legendText => {
				const legends = formEl.querySelectorAll("legend");
				legends.forEach(legend => {
					if (legend.textContent.trim().toLowerCase() === legendText.toLowerCase()) {
						const row = legend.closest(".mktoFormRow");
						if (row) {
							row.classList.add("oto-hidden");
	
							if (this.options.debug) {
								console.log(`⚡️ Hiding fieldset with legend: "${legendText}"`);
							}
						}
					}
				});
			});
		}
		
		// ✅ Hide ALL legends if `hideLegends: true`
		if (this.options.hideLegends) {
			const legends = formEl.querySelectorAll("legend");
			legends.forEach(legend => {
				if (legend) {
					legend.classList.add("oto-hidden");
		
					if (this.options.debug) {
						console.log(`⚡️ Hiding legend: "${legend.textContent.trim()}"`);
					}
				}
			});
		}
		
	}
	
	/**
	 * Hides labels associated with specific input types and field groups based on `hideLabels`.
	 * Applies `.visually-hidden` to matching labels.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	hideLabelsForFields(form) {
		if (!this.options.hideLabels || !Array.isArray(this.options.hideLabels)) {
			return;
		}
	
		const formEl = form.getFormElem()[0];
	
		this.options.hideLabels.forEach(type => {
			let selector;
	
			switch (type) {
				case "text":
				case "url":
				case "number":
				case "email":
				case "tel":
				case "date":
				case "textarea":
					selector = `input[type="${type}"], textarea`;
					formEl.querySelectorAll(selector).forEach(input => {
						this.hideLabelForInput(input);
					});
					break;
	
				case "select":
					selector = "select";
					formEl.querySelectorAll(selector).forEach(select => {
						this.hideLabelForInput(select);
					});
					break;
	
				case "checkboxlist":
					formEl.querySelectorAll(".mktoCheckboxList").forEach(list => {
						this.hideAssociatedLabel(list);
					});
					break;
	
				case "radiolist":
					formEl.querySelectorAll(".mktoRadioList").forEach(list => {
						this.hideAssociatedLabel(list);
					});
					break;
	
				default:
					return;
			}
		});
	}

	
	/**
	 * Hides the label associated with a given input field.
	 *
	 * @param {HTMLElement} input - The input field element.
	 */
	hideLabelForInput(input) {
		const label = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
		if (label) {
			label.classList.add("visually-hidden");
			if (this.options.debug) {
				console.log(`⚡️ Hiding label for input:`, input.name);
			}
		}
	}
	
	/**
	 * Hides the label adjacent to a `.mktoCheckboxList` or `.mktoRadioList`
	 * that shares the same `name` attribute as inputs inside the list.
	 *
	 * @param {HTMLElement} list - The checkbox or radio list element.
	 */
	hideAssociatedLabel(list) {
		const firstInput = list.querySelector("input");
		if (!firstInput || !firstInput.name) return;
	
		const label = list.closest(".mktoFieldWrap")?.querySelector(`label[for="${firstInput.name}"]`);
		if (label) {
			label.classList.add("visually-hidden");
			if (this.options.debug) {
				console.log(`⚡️ Hiding label for list with name:`, firstInput.name);
			}
		}
	}

	/**
	 * Validates the honeypot field to prevent spam submissions.
	 * If the honeypot field contains any value, submission is blocked.
	 *
	 * @param {Object} form - The Marketo form instance.
	 * @returns {Promise<boolean>} - Resolves `true` if the honeypot field is empty (valid), `false` otherwise.
	 */
	setupHoneypotValidation(form) {
		return new Promise((resolve) => {
			const honeypotFieldName = this.options.honeypot;
			if (!honeypotFieldName) return resolve(true); // No honeypot set
	
			const formEl = form.getFormElem()[0];
			const honeypotField = formEl.querySelector(`[name="${honeypotFieldName}"]`);
	
			if (!honeypotField) {
				if (this.options.debug) {
					console.warn(`⚠️ Honeypot field not found: ${honeypotFieldName}`);
				}
				return resolve(true); // If honeypot field is missing, allow submission
			}
	
			if (honeypotField.value.trim() === "") {
				if (this.options.debug) {
					console.log("✅ Honeypot validation passed (empty field).");
				}
				resolve(true); // Allow submission
			} else {
				if (this.options.debug) {
					console.warn("🚨 Honeypot triggered! Submission blocked.");
				}
				resolve(false); // Block submission
			}
		});
	}
	
	/**
	 * Adds the "Not You?" button after a specified element and attaches an event listener.
	 */
	setupNotYouButton() {
		if (!this.options.notYou || !this.options.notYouHtml || !this.options.notYouAfterElem) return;
	
		const targetElem = document.querySelector(this.options.notYouAfterElem);
		if (!targetElem) {
			if (this.options.debug) {
				console.warn(`⚠️ Target element for "Not You?" not found: ${this.options.notYouAfterElem}`);
			}
			return;
		}
	
		// Inject "Not You?" HTML
		const notYouContainer = document.createElement("div");
		notYouContainer.innerHTML = this.options.notYouHtml;
		targetElem.insertAdjacentElement("afterend", notYouContainer);
	
		if (this.options.debug) {
			console.log(`⚡️ Injected "Not You?" button after: ${this.options.notYouAfterElem}`);
		}
	
		// Attach event listener to the "Not You?" button
		const notYouButton = document.querySelector("#not-you-button");
		if (notYouButton) {
			notYouButton.addEventListener("click", (event) => {
				event.preventDefault();
				this.notYouHandler();
			});
		}
	}
	
	/**
	 * Handles the "Not You?" button click event.
	 * Clears the Marketo tracking cookie and reloads the page without tracking parameters.
	 */
	notYouHandler() {
		if (this.options.debug) {
			console.log("⚡️ Not You? button clicked. Clearing Marketo tracking cookie.");
		}
	
		FormsPlus.util.DNS.climbDomains([], (domain) => {
			FormsPlus.util.Cookies.remove(FormsPlus.strings.MARKETO_TRACKING_COOKIE, {
				domain: domain,
				path: "/"
			});
		});
	
		const redirectURI = new FormsPlus.util.URI.URI();
		redirectURI.removeSearch([
			FormsPlus.strings.MARKETO_EMAIL_ASSOCIATOR_TOKEN,
			FormsPlus.strings.MARKETO_FORM_DATA_CACHE
		]);
	
		document.location.href = redirectURI;
	}
	
	/**
	 * Refactors number inputs into stepper UI elements.
	 * - Only targets inputs specified in `numberRefactoreItems`.
	 * - Preserves min, max, and applies step attributes correctly.
	 * - Adds "+" and "−" buttons for easy increment/decrement.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	refactorNumberInputs(form) {
		if (!this.options.numberRefactore || !this.options.numberRefactoreItems) return; // Skip if disabled
	
		const formEl = form.getFormElem()[0];
	
		Object.entries(this.options.numberRefactoreItems).forEach(([inputName, stepValue]) => {
			const inputEl = formEl.querySelector(`input[name="${inputName}"][type="number"]`);
	
			if (!inputEl) {
				if (this.options.debug) {
					console.warn(`⚠️ Number input "${inputName}" not found.`);
				}
				return;
			}
	
			// Ensure a valid step value
			const step = stepValue === "any" ? "any" : parseFloat(stepValue) || 1;
			const min = inputEl.getAttribute("min") || "";
			const max = inputEl.getAttribute("max") || "";
			const currentValue = inputEl.value || "";
	
			// ✅ Create stepper wrapper
			const stepperWrapper = document.createElement("span");
			stepperWrapper.classList.add("oto-num-stepper");
	
			// ✅ Create decrement button
			const decrementBtn = document.createElement("button");
			decrementBtn.setAttribute("type", "button");
			decrementBtn.textContent = "−";
			decrementBtn.addEventListener("click", () => this.stepperInput(inputEl, -step, min));
	
			// ✅ Create increment button
			const incrementBtn = document.createElement("button");
			incrementBtn.setAttribute("type", "button");
			incrementBtn.textContent = "+";
			incrementBtn.addEventListener("click", () => this.stepperInput(inputEl, step, max));
	
			// ✅ Modify the input field
			inputEl.setAttribute("step", step);
			inputEl.setAttribute("min", min);
			inputEl.setAttribute("max", max);
			inputEl.setAttribute("readonly", "true"); // Prevent manual typing
			inputEl.value = currentValue;
	
			// ✅ Insert the stepper wrapper before the input field
			inputEl.parentNode.insertBefore(stepperWrapper, inputEl);
	
			// ✅ Move the input inside the stepper wrapper
			stepperWrapper.appendChild(decrementBtn);
			stepperWrapper.appendChild(inputEl);
			stepperWrapper.appendChild(incrementBtn);
	
			if (this.options.debug) {
				console.log(`✅ Refactored number input "${inputName}" with step ${step}.`);
			}
		});
	}
	
	/**
	 * Adjusts the value of a number input when clicking stepper buttons.
	 *
	 * @param {HTMLElement} inputEl - The number input element.
	 * @param {number} stepChange - The amount to increment/decrement.
	 * @param {string} limit - The min/max limit.
	 */
	stepperInput(inputEl, stepChange, limit) {
		let currentValue = parseFloat(inputEl.value) || 0;
		const step = inputEl.getAttribute("step") === "any" ? 1 : parseFloat(inputEl.getAttribute("step"));
		const min = inputEl.getAttribute("min") ? parseFloat(inputEl.getAttribute("min")) : -Infinity;
		const max = inputEl.getAttribute("max") ? parseFloat(inputEl.getAttribute("max")) : Infinity;
	
		let newValue = currentValue + stepChange;
	
		// ✅ Ensure value stays within limits
		if (newValue < min) newValue = min;
		if (newValue > max) newValue = max;
	
		inputEl.value = newValue;
	}

	/**
	 * Processes `radios` option to apply styles, inline settings, and behavior to ALL radio inside a group.
	 */
	/**
	 * Processes `radios` option to apply styles, inline settings, and behavior to ALL radio buttons inside a group.
	 */
	processRadioOptions() {
		const formEl = document.querySelector(".mktoForm");
		if (!formEl) return;
	
		// If `radios` option is missing or invalid, apply default class
		if (!this.options.radios || (Array.isArray(this.options.radios) && this.options.radios.length === 0)) {
		// if (!this.options.radios || typeof this.options.radios !== "object") {
			formEl.querySelectorAll(".mktoRadioList").forEach(radioList => {
				if (!radioList.classList.contains("otoform-default-radios")) {
					radioList.classList.add("otoform-default-radios");
				}
			});
	
			if (this.options.debug) {
				console.warn("⚠️ No specific radio configurations found. Applied 'otoform-default-radios' to all radio lists.");
			}
			return;
		}
	
		// Process each defined radio group
		Object.keys(this.options.radios).forEach(groupName => {
			const config = this.options.radios[groupName];
			const radios = formEl.querySelectorAll(`input[name="${groupName}"]`);
	
			if (radios.length === 0) {
				if (this.options.debug) {
					console.warn(`⚠️ No radios found for group: ${groupName}`);
				}
				return;
			}
	
			radios.forEach(input => {
				const radioList = input.closest(".mktoRadioList");
				if (!radioList) return;
	
				// Ensure default class is applied if no styles specified
				if (!config.style && !config.inline) {
					radioList.classList.add("otoform-default-radios");
				}
	
				// Apply inline class if `inline: true`
				if (config.inline) {
					radioList.classList.add("otoform-inline-radios");
				}
	
				// Apply style if `style` is defined
				if (config.style === "tabs") {
					radioList.classList.add("otoform-tabs-radios");
				} else if (config.style === "square") {
					radioList.classList.add("otoform-square-radios");
				} else {
					radioList.classList.add("otoform-default-radios");
				}
	
				if (this.options.debug) {
					console.log(`⚡️ Processed radio group "${groupName}" with style: ${config.style || "default"}`);
				}
			});
		});
	}

	/**
	 * Processes `checkBoxes` option to apply styles, inline settings, and behavior to ALL checkboxes inside a group.
	 */
	processCheckboxOptions() {
		const formEl = document.querySelector(".mktoForm");
		if (!formEl) return;
	
		// If `checkBoxes` option is missing or is an empty array, apply default class
		if (!this.options.checkBoxes || (Array.isArray(this.options.checkBoxes) && this.options.checkBoxes.length === 0)) {
			formEl.querySelectorAll(".mktoCheckboxList").forEach(checkboxList => {
				if (!checkboxList.classList.contains("otoform-default-checkboxes")) {
					checkboxList.classList.add("otoform-default-checkboxes");
				}
			});
			
			if (this.options.debug) {
				console.warn("⚠️ No specific checkbox configurations found. Applied 'otoform-default-checkboxes' to all checkbox lists.");
			}
			return;
		}
	
		// Process each defined checkbox group
		Object.keys(this.options.checkBoxes).forEach(groupName => {
			const config = this.options.checkBoxes[groupName];
			const checkboxes = formEl.querySelectorAll(`input[name="${groupName}"]`);
	
			if (checkboxes.length === 0) {
				if (this.options.debug) {
					console.warn(`⚠️ No checkboxes found for group: ${groupName}`);
				}
				return;
			}
	
			checkboxes.forEach(input => {
				const checkboxList = input.closest(".mktoCheckboxList");
	
				if (!checkboxList) return;
	
				// Ensure default class is applied if no styles specified
				if (!config.style && !config.inline && !config.behavior) {
					checkboxList.classList.add("otoform-default-checkboxes");
				}
	
				// Apply inline class if `inline: true`
				if (config.inline) {
					checkboxList.classList.add("otoform-inline-checkboxes");
				}
	
				// Apply switch styling if `style: round | square`
				if (config.style === "round" || config.style === "square") {
					this.initSwitches(input, config.style);
				} else {
					checkboxList.classList.add("otoform-default-checkboxes");
				}
	
				// Apply radio behavior if `behavior: actAsRadio`
				if (config.behavior === "actAsRadio") {
					this.initializeCheckboxGroupAsRadio(groupName);
				}
			});
		});
	}

	/**
	 * Converts checkboxes into styled switches.
	 *
	 * @param {HTMLElement} input - The checkbox input field.
	 * @param {string} style - The switch style (`round` or `square`).
	 */
	initSwitches(input, style) {
		const checkboxList = input.closest(".mktoCheckboxList");
		if (!checkboxList) return;
	
		if (!checkboxList.classList.contains("otoform-switches")) {
			checkboxList.classList.add("otoform-switches");
		} else {
			checkboxList.classList.add("otoform-classic");
		}
	
		const label = document.createElement("label");
		label.classList.add("otoform-switch");
		input.parentNode.insertBefore(label, input);
		label.appendChild(input);
	
		const span = document.createElement("span");
		span.classList.add("otoform-slider", `otoform-slider-${style}`); // Corrected class name format
		label.appendChild(span);
	
		if (this.options.debug) {
			console.log(`Applied ${style} switch styling to checkbox:`, input.name);
		}
	}
	
	/**
	 * Ensures only one checkbox is checked at a time within the specified group.
	 *
	 * @param {string} groupName - The checkbox group name (input `name` attribute).
	 */
	initializeCheckboxGroupAsRadio(groupName) {
		const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
	
		if (checkboxes.length === 0) return;
	
		checkboxes.forEach(checkbox => {
			checkbox.addEventListener("click", function () {
				checkboxes.forEach(cb => {
					if (cb !== checkbox) {
						cb.checked = false;
					}
				});
			});
		});
	
		// Ensure only one checkbox is checked on load
		const checkedBox = Array.from(checkboxes).find(cb => cb.checked);
		if (checkedBox) {
			checkboxes.forEach(cb => {
				if (cb !== checkedBox) {
					cb.checked = false;
				}
			});
		}
	
		if (this.options.debug) {
			console.log(`Initialized radio-like behavior for checkbox group: ${groupName}`);
		}
	}
	
	/**
	 * Replaces tokens in form elements with corresponding values from `updateTokensList`
	 * while preserving the original HTML structure.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	replaceTokensInForm(form) {
		if (!this.options.updateTokens || typeof this.options.updateTokens !== "object") return;
	
		const formEl = form.getFormElem()[0];
		const elements = formEl.querySelectorAll("*:not(script):not(style)"); // Target all non-script/style elements
	
		elements.forEach(element => {
			Object.keys(this.options.updateTokens).forEach(token => {
				const replacement = this.options.updateTokens[token];
	
				// Replace text content inside elements (e.g., `<button>{{my.CTA Label}}</button>`)
				if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
					if (element.textContent.includes(token)) {
						element.textContent = element.textContent.replace(token, replacement);
						if (this.options.debug) {
							console.log(`Replaced token "${token}" in element:`, element);
						}
					}
				}
	
				// Replace tokens inside input fields' value attributes
				if (element.hasAttribute("value") && element.getAttribute("value").includes(token)) {
					element.setAttribute("value", element.getAttribute("value").replace(token, replacement));
					if (this.options.debug) {
						console.log(`Replaced token "${token}" in input value:`, element);
					}
				}
	
				// Replace tokens inside placeholder attributes
				if (element.hasAttribute("placeholder") && element.getAttribute("placeholder").includes(token)) {
					element.setAttribute("placeholder", element.getAttribute("placeholder").replace(token, replacement));
					if (this.options.debug) {
						console.log(`Replaced token "${token}" in placeholder:`, element);
					}
				}
			});
		});
	}
	
	/**
	 * Updates checkbox labels with custom content if specified in the `customLabels` option.
	 * Ensures only checkboxes with existing `for` attributes are modified.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	initCustomLabels(form) {
		if (!this.options.customLabels || typeof this.options.customLabels !== "object") return;
	
		const formEl = form.getFormElem()[0];
	
		Object.entries(this.options.customLabels).forEach(([labelID, labelContent]) => {
			if (!labelID || !labelContent) return;
	
			const labelElem = formEl.querySelector(`label[for="${labelID}"]`);
			
			if (labelElem) {
				labelElem.innerHTML = labelContent;
	
				if (this.options.debug) {
					console.log(`Updated label for "${labelID}" with custom content.`);
				}
			} else if (this.options.debug) {
				console.warn(`Label with for="${labelID}" not found.`);
			}
		});
	}
	
	/** DEPRECATED
	 * Handles Google reCAPTCHA validation.
	 * - Returns a Promise resolving `true` (valid) or `false` (invalid).
	 * - Ensures reCAPTCHA executes before form submission.
	setupRecaptchaValidation(form) {
		return new Promise((resolve) => {
			if (!this.options.recaptcha || !this.options.recaptchaConfig?.apiKeys) {
				return resolve(true); // ✅ Skip validation if reCAPTCHA is disabled
			}
	
			// ✅ Ensure Marketo's reCAPTCHA is available
			const captchaElement = document.querySelector(".g-recaptcha");
			if (!captchaElement) {
				console.warn("⚠️ reCAPTCHA element not found. Skipping validation.");
				return resolve(true); // ✅ Allow submission if reCAPTCHA is missing
			}
	
			console.log("🚀 Triggering Marketo's reCAPTCHA...");
	
			// ✅ Trigger reCAPTCHA manually using Marketo's callback
			if (typeof window.grecaptcha !== "undefined" && typeof window.captchaCallback === "function") {
				grecaptcha.execute();
			} else {
				console.error("❌ Marketo reCAPTCHA not initialized properly.");
				return resolve(false);
			}
			
			// ✅ Wait for Marketo's reCAPTCHA response
			let attempts = 0;
			const maxAttempts = 10; // Prevent infinite loop
	
			const interval = setInterval(() => {
				const recaptchaResponse = document.getElementById("g-recaptcha-response");
	
				if (recaptchaResponse && recaptchaResponse.value) {
					clearInterval(interval);
					console.log("✅ Marketo reCAPTCHA validated successfully.");
	
					let mktoFields = {};
					mktoFields[this.options.recaptchaConfig.recaptchaFinger] = recaptchaResponse.value;
					form.addHiddenFields(mktoFields);
	
					return resolve(true);
				}
	
				attempts++;
				if (attempts >= maxAttempts) {
					clearInterval(interval);
					console.warn("⚠️ reCAPTCHA validation timed out. Allowing submission.");
					return resolve(true);
				}
			}, 500); // Check every 500ms, max 5 seconds
		});
	}
	 */
	/**
	 * Translates form elements based on a JSON translation file.
	 * - Supports translating `textContent` and `placeholder` attributes.
	 * - Loads translation JSON from `this.options.translateJson.folder`.
	 * - Uses the `<html>` `lang` attribute to determine which file to load.
	 * - Applies translations at the end of `onFormReady()`.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	applyTranslations(form) {
		if (!this.options.translate || this.options.translate !== "json") return; // Skip if disabled
	
		const lang = document.documentElement.lang || "en"; // Default to English if no lang attribute
		const jsonUrl = `${this.options.translateJson.folder}${lang}.json`;
	
		if (this.options.debug) {
			console.log(`Loading translations from: ${jsonUrl}`);
		}
	
		fetch(jsonUrl)
			.then(response => response.json())
			.then(translations => {
				Object.keys(translations).forEach(selector => {
					const elements = document.querySelectorAll(selector);
	
					elements.forEach(el => {
						// Handle text content translation
						if (!["INPUT", "TEXTAREA"].includes(el.tagName)) {
							el.textContent = translations[selector];
							if (this.options.debug) {
								console.log(`Translated ${selector} → "${translations[selector]}"`);
							}
						}
	
						// Handle `placeholder` translation
						if (el.hasAttribute("placeholder") && translations[selector].placeholder) {
							el.setAttribute("placeholder", translations[selector].placeholder);
							if (this.options.debug) {
								console.log(`Translated placeholder for ${selector} → "${translations[selector].placeholder}"`);
							}
						}
					});
				});
	
				if (this.options.debug) {
					console.log(`Translations applied for language: ${lang}`);
				}
			})
			.catch(error => {
				console.error(`Failed to load translations: ${error}`);
			});
	}
	
	/**
	 * Removes specified Marketo elements from the form.
	 * - Uses `removeElems` array from options.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	cleanUpMktoElements(form) {
		if (!Array.isArray(this.options.removeElems) || this.options.removeElems.length === 0) {
			return; // Exit if no elements are defined to remove
		}
	
		const formEl = form.getFormElem()[0];
	
		this.options.removeElems.forEach(selector => {
			const elements = formEl.querySelectorAll(selector);
			elements.forEach(el => el.remove());
	
			if (this.options.debug && elements.length) {
				console.log(`Removed ${elements.length} elements matching: "${selector}"`);
			}
		});
	}
	
	/**
	 * Processes URL parameters and stores them in hidden fields.
	 * - Supports using cookie values first (`cookiesFirst.prefix`).
	 * - Excludes parameters listed in `excludeList`.
	 * - Maps URL parameters to specific form fields.
	 * - Creates hidden fields if they don't exist.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	processUrlParams(form) {
		if (!this.options.urlParamsToHiddenFields) return; // Exit if disabled
	
		const config = this.options.urlParamsToHiddenFieldsConfig;
		if (!config || typeof config !== "object") return; // Exit if config is invalid
	
		const formEl = form.getFormElem()[0];
		const urlParams = new URLSearchParams(window.location.search);
		const paramValues = {}; // Store processed values
	
		Object.entries(config.mapping).forEach(([param, inputName]) => {
			if (config.excludeList.includes(param)) return; // Skip excluded parameters
	
			let value = null;
	
			// Try to get value from cookies first
			if (config.cookiesFirst && config.cookiesFirst.prefix) {
				const cookieName = `${config.cookiesFirst.prefix}${param}`;
				value = this.getCookie(cookieName); // Retrieve cookie value
			}
	
			// Fallback to URL parameter if no cookie value
			if (!value) {
				value = urlParams.get(param);
			}
	
			if (value) {
				paramValues[inputName] = value; // Store processed value
			}
		});
	
		// Inject values into hidden fields
		Object.entries(paramValues).forEach(([inputName, value]) => {
			let inputField = formEl.querySelector(`input[name="${inputName}"]`);
	
			// Create hidden field if missing
			if (!inputField) {
				inputField = document.createElement("input");
				inputField.type = "hidden";
				inputField.name = inputName;
				formEl.appendChild(inputField);
			}
	
			// Set the field value
			inputField.value = value;
	
			if (this.options.debug) {
				console.log(`Set hidden field "${inputName}" with value: ${value}`);
			}
		});
	}
	
	/**
	 * Handles `toggleDisabling` behavior for checkboxes and radio buttons.
	 */
	setupToggleDisabling(form) {
		const formEl = form.getFormElem()[0];
	
		// Process Radio-Based Toggle Disabling
		if (this.options.radios) {
			Object.keys(this.options.radios).forEach(groupName => {
				const config = this.options.radios[groupName];
				if (config.behavior !== "toggleDisabling") return;
	
				const radios = formEl.querySelectorAll(`input[name="${groupName}"]`);
				if (!radios.length) return;
	
				const yesRadio = Array.from(radios).find(radio => radio.value === config.relations.yesValue);
				const noRadio = Array.from(radios).find(radio => radio.value === config.relations.noValue);
				const checkboxGroup = formEl.querySelectorAll(`input[name="${config.relations.targetCheckboxList}"]`);
	
				if (!yesRadio || !noRadio || !checkboxGroup.length) return;
	
				const toggleCheckboxes = (disable) => {
					checkboxGroup.forEach(checkbox => {
						checkbox.disabled = disable;
						if (disable) checkbox.checked = false; // Uncheck when disabling
					});
				};
	
				// Set Default State
				toggleCheckboxes(noRadio.checked);
	
				// Add Event Listeners
				yesRadio.addEventListener("change", () => toggleCheckboxes(false));
				noRadio.addEventListener("change", () => toggleCheckboxes(true));
			});
		}
	
		// Process Checkbox-Based Toggle Disabling
		if (this.options.checkBoxes) {
			Object.keys(this.options.checkBoxes).forEach(groupName => {
				const config = this.options.checkBoxes[groupName];
				if (config.behavior !== "toggleDisabling") return;
	
				const checkboxes = formEl.querySelectorAll(`input[name="${groupName}"]`);
				if (!checkboxes.length) return;
	
				const fullDayCheckbox = Array.from(checkboxes).find(cb => cb.value === config.relations.fullDayValue);
				const dependentCheckboxes = checkboxes
					.filter(cb => config.relations.disableOnChecked.includes(cb.value));
	
				if (!fullDayCheckbox || !dependentCheckboxes.length) return;
	
				const toggleDependentCheckboxes = (disable) => {
					dependentCheckboxes.forEach(cb => {
						cb.disabled = disable;
						if (disable) cb.checked = false;
					});
				};
	
				// Set Default State
				toggleDependentCheckboxes(fullDayCheckbox.checked);
	
				// Add Event Listener
				fullDayCheckbox.addEventListener("change", () => {
					toggleDependentCheckboxes(fullDayCheckbox.checked);
				});
			});
		}
	}

	
	/**
	 * Converts a string into a slug format.
	 * Example: "Contact Information" → "contact-information"
	 *
	 * @param {string} text - The input text.
	 * @returns {string} - The slugified string.
	 */
	slugify(text) {
		return text
			.toLowerCase()
			.replace(/[\s]+/g, "-") // Replace spaces with dashes
			.replace(/[^\w-]+/g, ""); // Remove special characters
	}
	
	/**
	 * Retrieves a cookie value by name.
	 *
	 * @param {string} name - The cookie name.
	 * @returns {string|null} - The cookie value or null if not found.
	 */
	getCookie(name) {
		const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
		return match ? decodeURIComponent(match[2]) : null;
	}
	
	
	
	/**
	 * Hashes a given string using SHA-256.
	 * @param {string} input - The string to hash.
	 * @returns {Promise<string>} - The hashed string in hexadecimal format.
	 */
	async sha256(input) {
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		return Array.from(new Uint8Array(hashBuffer))
			.map(byte => byte.toString(16).padStart(2, "0"))
			.join("");
	}
	
	/**
	 * Pushes data to the GTM dataLayer.
	 * @param {string} event - The event name to push.
	 * @param {Object} additionalData - Additional data to include in the event.
	 */
	async pushToDataLayer(event, additionalData = {}) {
		if (!this.options.dataLayerTracking || !this.options.dataLayerConfig) return;
	
		// Ensure `this.form` is properly initialized
		if (!this.form) {
			console.warn("⚠️ pushToDataLayer: Form is not initialized yet.");
			return;
		}
	
		const config = this.options.dataLayerConfig;
		if (!event) return;
	
		window.dataLayer = window.dataLayer || [];
	
		const eventData = {
			event: event,
			formID: this.formID
		};
	
		// Include referrer URL
		if (config.additionalData.includeReferrer) {
			eventData.requestReferrerUrl = document.referrer || window.location.href;
		}
	
		// Include user email (hashed if enabled)
		if (config.additionalData.includeUserEmail) {
			const formEl = this.form.getFormElem()[0];
			const emailInput = formEl.querySelector(`input[name="${config.additionalData.includeUserEmail}"]`);
			if (emailInput && emailInput.value) {
				const email = emailInput.value.trim().toLowerCase();
				if (config.additionalData.hashEmail) {
					eventData.userEmailHashed = await this.sha256(email);
				} else {
					eventData.userEmail = email;
				}
			}
		}
	
		Object.assign(eventData, additionalData);
	
		window.dataLayer.push(eventData);
	
		if (this.options.debug) {
			console.log(`DataLayer Event: ${event}`, eventData);
		}
	}
	
	/**
	 * Executes custom behavior functions defined in `customBehaviorsOnFormReady`.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	executeCustomBehaviorsOnFormReady(form) {
		if (!this.options.customBehaviorsOnFormReady || typeof this.options.customBehaviorsOnFormReady !== "object") return;
	
		Object.keys(this.options.customBehaviorsOnFormReady).forEach(behaviorKey => {
			const behaviorFn = this.options.customBehaviorsOnFormReady[behaviorKey];
	
			if (typeof behaviorFn === "function") {
				if (this.options.debug) {
					console.log(`🔹 Executing custom behavior On Form Ready: ${behaviorKey}`);
				}
				behaviorFn(form); // Execute the function with the form instance
			} else {
				console.warn(`⚠️ Custom On Form Ready behavior "${behaviorKey}" is not a function.`);
			}
		});
	}
	
	/**
	 * Executes custom behavior functions defined in `customBehaviorsOnFormSuccess`.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	executeCustomBehaviorsOnFormSuccess(form) {
		if (!this.options.customBehaviorsOnFormSuccess || typeof this.options.customBehaviorsOnFormSuccess !== "object") return;
	
		Object.keys(this.options.customBehaviorsOnFormSuccess).forEach(behaviorKey => {
			const behaviorFn = this.options.customBehaviorsOnFormSuccess[behaviorKey];
	
			if (typeof behaviorFn === "function") {
				if (this.options.debug) {
					console.log(`🔹 Executing custom behavior On Form Success: ${behaviorKey}`);
				}
				behaviorFn(form); // Execute the function with the form instance
			} else {
				console.warn(`⚠️ Custom On Form Success behavior "${behaviorKey}" is not a function.`);
			}
		});
	}
	
	/**
	 * Executes custom behavior functions defined in `customBehaviorsOnFormPrefill`.
	 *
	 * @param {Object} form - The Marketo form instance.
	 */
	executeCustomBehaviorsOnFormPrefill(form) {
		if (!this.options.customBehaviorsOnFormPrefill || typeof this.options.customBehaviorsOnFormPrefill !== "object") return;
	
		Object.keys(this.options.customBehaviorsOnFormPrefill).forEach(behaviorKey => {
			const behaviorFn = this.options.customBehaviorsOnFormPrefill[behaviorKey];
	
			if (typeof behaviorFn === "function") {
				if (this.options.debug) {
					console.log(`🔹 Executing custom behavior On Form Prefill: ${behaviorKey}`);
				}
				behaviorFn(form); // Execute the function with the form instance
			} else {
				console.warn(`⚠️ Custom On Form Prefill behavior "${behaviorKey}" is not a function.`);
			}
		});
	}
}
