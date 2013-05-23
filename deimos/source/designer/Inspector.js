enyo.kind({
	name: "Inspector",
	kind: "FittableRows",
	events: {
		onModify: ""
	},
	published: {
		filterLevel: null,		// Value will be given by Inspector.FilterXXX "checked" item.
		filterType: null,		// Value will be given by Inspector.FilterXXX "checked" item.
		projectIndexer: null,	// Analyzer output for the current project
		projectData: null		// All the project data shared mainly between phobos and deimos
	},
	components: [
		{kind: "Inspector.FilterType", onValueChanged: "updateFilterType"},
		{kind: "Scroller", fit: true, components: [
			{name: "content", kind: "FittableRows", onActivate: "inheritAttributeToggle"}
		]},
		{kind: "Inspector.FilterLevel", onValueChanged: "updateFilterLevel"}
	],
	handlers: {
		onChange: "change",
		onDblClick: "dblclick"
	},
	style: "padding: 8px; white-space: nowrap;",
	debug: false,
	helper: null,			// Analyzer.KindHelper
	userDefinedAttributes: {},
	ccsEditorConfig: [],
	create: function() {
		this.inherited(arguments);

		// TODO: hardcoded static css config - will be revisited
		var tmpCssConfig = {
			cssStyleName: "Font-Style",
			properties: new Array("font-size")
		};
		this.ccsEditorConfig.push(tmpCssConfig);

		this.helper = new analyzer.Analyzer.KindHelper();
		
		//* TODO - should be moved to KindHelper.js.
		this.helper.getPublishedWithValues = function() {
			this.checkDefAvail();
			var published = [];

			obj = this.definition.properties;
			for (i=0; i<obj.length; i++) {
				if (obj[i].token === "published") {
					p = obj[i].value[0].properties;
					for (var j=0; j < p.length; j++) {
						if (p[j].value[0].type != "array") {
							var val = "";
							try {
								// TODO - shouldn't have to eval() here. Strings come back with double double quotes ("""")
								val = eval(p[j].value[0].token);
							} catch(err) {
								enyo.warn("Invalid value for property '" + p[j].name +"': " +  p[j].value[0].token);
							}
							published.push({
								name:   p[j].name,
								value:  val
							});
						}
					}
				}
			}
			return published;
		}
	},
	allowed: function(inKindName, inType, inName) {
		var level = Model.getFilterLevel(inKindName, inType, inName);
		if (this.debug) { this.log("Level: " + level + " for " + inKindName + "." + inName); }		
		return level >= this.filterLevel;
	},
	//* Return complete list of published properties for _inControl_
	buildPropList: function(inControl) {
		var kindName = inControl.kind;
		var currentKind = kindName;

		var definition = this.getKindDefinition(currentKind);
		if (!definition) {
			if (this.debug) { this.log("NO DEFINITION found for '" + currentKind + "' inControl: ", inControl); }
			// Revert to the property and event list extracted from the object
			return this.buildPropListFromObject(inControl);
		}

		// TODO: event list must come from the Analyzer output.
		var domEvents = ["ontap", "onchange", "ondown", "onup", "ondragstart", "ondrag", "ondragfinish", "onenter", "onleave"]; // from dispatcher/guesture
		var propMap = {}, eventMap = {};
		while (definition) {
			// Setup helper with current definition
			this.helper.setDefinition(definition);
			
			// Get all published properties for this kind
			var publishedProperties = this.helper.getPublishedWithValues();
			if (this.debug) {
				this.log("buildPropList: publishedProperties", publishedProperties);
			}
			
			// Add an entry to _propMap[]_ for each property found in _publishedProperties_
			for (var i = 0, p; (p = publishedProperties[i]); i++) {
				if (((this.allowed(kindName, "properties", p.name)) || 
					(this.userDefinedAttributes[inControl.aresId].hasOwnProperty(p.name)))) {
					if (this.debug) { this.log("Adding property '" + p.name + "' from '" + currentKind + "'"); }
					propMap[p.name] = p.value;
				}
			}
			
			// Get all events for this kind
			var events = this.helper.getEvents();
			
			// Add an entry to _eventMap[]_ for each event found in _events_
			for (i = 0, p; (p = events[i]); i++) {
				if (((this.allowed(kindName, "events", p)) ||
					(this.userDefinedAttributes[inControl.aresId].hasOwnProperty(p)))) {
					if (this.debug) { this.log("Adding event '" + p + "' from '" + currentKind + "'"); }
					eventMap[p] = true;
				}
			}
			
			// Set _currentKind_ to the next superkind (if exists)
			currentKind = definition.superkind || "";
			
			if (currentKind === "") {
				definition = null;
			} else {
				definition = this.getKindDefinition(currentKind);
			}
		}
		
		var props = propMap;
		
		props.events = [];
		for (n in eventMap) {
			props.events.push(n);
		}
		for (n=0; n < domEvents.length; n++) {
			if (this.allowed(kindName, "events", domEvents[n])) {
				props.events.push(domEvents[n]);
			}
		}
		
		if (this.debug) { this.log("buildPropList: props", props); }
		return props;
	},
	buildPropListFromObject: function(inControl) {
		// Get the property and event list from the Object as we cannot get it from the analyzer
		var domEvents = ["ontap", "onchange", "ondown", "onup", "ondragstart", "ondrag", "ondragfinish", "onenter", "onleave"]; // from dispatcher/guesture
		var propMap = {}, eventMap = {};
		var context = inControl;
		var kindName = inControl.kind;
		while (context) {
			for (var p in context.published) {
				if (this.allowed(kindName, "properties", p)) {
					if (this.debug) { this.log("Adding property '" + p + "' from '" + context.kind + "'"); }
					propMap[p] = true;
				}
			}
			for (var e in context.events) {
				if (this.allowed(kindName, "events", e)) {
					if (this.debug) { this.log("Adding event '" + e + "' from '" + context.kind + "'"); }
					eventMap[e] = true;
				}
			}
			context = context.base && context.base.prototype;
		}
		var props = [];
		var propKeys = Object.keys(propMap).sort();
		for (var n = 0; n < propKeys.length; n++) {
			props.push(propKeys[n]);
		}
		props.events = [];
		for (var n in eventMap) {
			props.events.push(n);
		}
		for (n=0; n < domEvents.length; n++) {
			if (this.allowed(kindName, "events", domEvents[n])) {
				props.events.push(domEvents[n]);
			}
		}
		return props;
	},
	makeEditor: function(inControl, inName, inDefaultValue, inType) {
		if(inName === "events") {
			return;
		}
		
		if (this.debug) { this.log("Adding entry for " + inType + " " + inName + " : " + inDefaultValue); }
		
		var inherited = !(inControl.aresId && this.userDefinedAttributes && this.userDefinedAttributes[inControl.aresId] && typeof this.userDefinedAttributes[inControl.aresId][inName] !== "undefined"),
			value = (inherited) ? inDefaultValue : this.userDefinedAttributes[inControl.aresId][inName],
			classList = "ares-inspector-row",
			attributeRow,
			info,
			kind,
			attributeKind,
			attributeFieldName = "attributeVal";
		
		attributeRow = this.$.content.createComponent({classes: classList});
		attributeRow.createComponent({kind: "InheritCheckbox", checked: !inherited, prop: inName});

		if (inType === 'events') {
			kind = "Inspector.Config.Event";
		}
		
		info = Model.getInfo(inControl.kind, inType, inName);
		kind = (info && info.inputKind) || kind;


		
		// User defined kind: as an Object
		if (kind && kind instanceof Object) {
			kind = enyo.clone(kind);
			kind = enyo.mixin(kind, {name: attributeFieldName, fieldName: inName, fieldValue: value, fieldType: inType});
			attributeRow.createComponent(kind);
		} else {
			attributeKind = (kind)
				?	kind
				:	(value === true || value === false || value === "true" || value === "false")
					?	"Inspector.Config.Boolean"
					:	"Inspector.Config.Text";
		
			attributeRow.createComponent({name: attributeFieldName, kind: attributeKind, fieldName: inName, fieldValue: value, fieldType: inType, disabled: inherited});
		}
	},
	inspect: function(inControl) {
		var ps, i, p;
		this.$.content.destroyComponents();
		this.selected = inControl;
		if (inControl) {
			var kindName = inControl.name + " (" + inControl.kind + ")";
			this.$.content.createComponent({tag: "h3", content: kindName, classes: "label label-info"});
			ps = this.buildPropList(inControl);

			switch(this.filterType) {
				case 'P':
					this.$.content.createComponent({classes: "onyx-groupbox-header", content: "Properties"});
					for (p in ps) {
						this.makeEditor(inControl, p, ps[p], "properties");
					}				
					break;
				case 'E':
					ps = ps.events;
					if (ps.length) {
						this.$.content.createComponent({classes: "onyx-groupbox-header", content: "Events"});
					}
					for (i=0, p; (p=ps[i]); i++) {
						this.makeEditor(inControl, p, "", "events");
					}				
					break;
				case 'S':
					// TODO: hardcoded static css config - will be revisited
					// need to be build properties associated to style
					for (i=0, p; (p=this.ccsEditorConfig[i]); i++) {
						var categoryStyle = this.$.content.createComponent({name: p.name, kind: "CategoryStyle", });
						categoryStyle.setModel(p, inControl);
						this.makeEditor(inControl, p, "", "style");
					}				
					break;
				default:
					enyo.warn("Inspector has unknown filterType: ", filterType);
					break;
			}
		}
		this.$.content.render();
	},
	change: function(inSender, inEvent) {
		var n, v = "";
		if (this.filterType === "S") {
			// for now implementation done using this.filterType === "S" - will be revisited
			// will come with the css Editor configuration
			n = "style";
			if (inEvent.target && inEvent.target.fieldValue && inEvent.target.fieldValue !== "" &&
				inEvent.target && inEvent.target.fieldName) {
					v = (inEvent.target.fieldName) + ":" + (inEvent.target.fieldValue) + ";";				
			}
		} else {
			n = inEvent.target.fieldName;
			v = inEvent.target.fieldValue;			
		}

		var num = parseFloat(v);
		if (String(num) == v) {
			v = num;
		}

		if (this.debug) { this.log("Set property: " + n + " --> ", v); }

		// Save each change to _this.userDefinedAttributes_
		if(!this.userDefinedAttributes[this.selected.aresId]) {
			this.userDefinedAttributes[this.selected.aresId] = {};
		}

		if (this.filterType === "S") {
			var u = this.userDefinedAttributes[this.selected.aresId][n];
			var p = (u !== undefined) && (u.split(";"));
			if (!p) {
				// no style property defined, add one 
				this.userDefinedAttributes[this.selected.aresId][n] = v;
			} else {
					if (p.length <= 2 && 
						inEvent.target && 
						p[0].search(inEvent.target.fieldName) > -1 &&
						(v === "" || v === null)) {
						// remove the existing css style property
						delete this.userDefinedAttributes[this.selected.aresId][n];
					} else {
						var added = false;
						// modify the value of the existing css style property list
						for (i=0; i < p.length; i++) {
							if (inEvent.target && 
								p[i].search(inEvent.target.fieldName) > -1) {
								this.userDefinedAttributes[this.selected.aresId][n] = u.replace(p[i]+";", v);
								added = true;
							}
						}
						if (!added) {
							this.userDefinedAttributes[this.selected.aresId][n] = u + v;
						}															
					}
			}
			this.doModify({name: n, value: v, type: this.filterType});
		} else {
			this.userDefinedAttributes[this.selected.aresId][n] = v;
			this.doModify({name: n, value: v, type: inEvent.target.fieldType});	
		}		
	},
	dblclick: function(inSender, inEvent) {
		if (inEvent.target.fieldType === "events") {
			var n = inEvent.target.fieldName;
			var v = inEvent.target.fieldValue;
			if (!v) {
				v = this.selected.name + enyo.cap(n.slice(2));
				if (this.debug) { this.log("SET handler: " + n + " --> " + v); }
				inEvent.target.setFieldValue(v);
				this.change(inSender, inEvent);
			}
		}
	},
	/**
	 * Receive the project data reference which allows to access the analyzer
	 * output for the project's files, enyo/onyx and all the other project
	 * related information shared between phobos and deimos.
	 * @param  oldProjectData
	 * @protected
	 */
	projectDataChanged: function(oldProjectData) {
		if (oldProjectData) {
			oldProjectData.off('change:project-indexer', this.projectIndexReady);
			oldProjectData.off('update:project-indexer', this.projectIndexUpdated);
			Model.resetInformation();
		}

		if (this.projectData) {
			if (this.debug) { this.log("projectDataChanged: projectData", this.projectData); }
			this.projectData.on('change:project-indexer', this.projectIndexReady, this);
			this.projectData.on('update:project-indexer', this.projectIndexUpdated, this);
			this.setProjectIndexer(this.projectData.getProjectIndexer());
			Model.buildInformation(this.projectIndexer);
		}
	},
	/**
	 * The project analyzer output has changed
	 * @param value   the new analyzer output
	 * @protected
	 */
	projectIndexReady: function(model, value, options) {
		if (this.debug) { this.log("projectIndexReady: ", value); }
		this.setProjectIndexer(value);
	},
	projectIndexUpdated: function() {
		if (this.debug) { this.log("projectIndexUpdated: for projectIndexer: ", this.projectIndexer); }
		Model.buildInformation(this.projectIndexer);
	},
	initUserDefinedAttributes: function(inComponents) {
		this.userDefinedAttributes = {};
		
		var components = this.flattenComponents(inComponents);
		
		for(var i = 0, component; (component = components[i]); i++) {
			this.userDefinedAttributes[component.aresId] = component;
		}
	},
	flattenComponents: function(inComponents) {
		var ret = [],
			cs,
			c;
		
		if(!inComponents) {
			return ret;
		}
		
		for (var i = 0; (c = inComponents[i]); i++) {
			ret.push(c);
			if(c.components) {
				cs = this.flattenComponents(c.components);
				for (var j = 0; (c = cs[j]); j++) {
					ret.push(c);
				}
			}
		}
		
		return ret;
	},
	/**
	 * Locates the requested kind name based the following priorties
	 * - in the analysis of the currently edited file (most accurate)
	 * - else in the analysis of the project
	 * - else in the analysis of enyo/ares
	 * @param name: the kind to search
	 * @returns the definition of the requested kind or undefined
	 */
	getKindDefinition: function(name) {
		var definition = this.projectIndexer.findByName(name);
		if (definition === undefined) {
			// Try again with the enyo prefix as it is optional
			definition = this.projectIndexer.findByName("enyo." + name);
		}
		return definition;
	},
	/**
	 * The inspector's filters have changed.
	 * @protected
	 */
	updateFilterLevel: function(inSender, inEvent) {
		if (inEvent.active) {
			this.setFilterLevel(inEvent.active.value);
			this.inspect(this.selected);
		}
		return true;
	},
	updateFilterType: function(inSender, inEvent) {
		if (inEvent.active) {
			this.setFilterType(inEvent.active.value);
			if (inEvent.active.value === "S") {
				this.$.filterLevel.hide();				
			} else {
				this.$.filterLevel.show();
			}
			this.inspect(this.selected);
		}
		return true;
	},
	//* When an inherit checkbox is toggled, enable/disable the attribute
	inheritAttributeToggle: function(inSender, inEvent) {
		var originator = inEvent.originator,
			row = originator.parent,
			attribute = originator.prop;
		
		// Make sure this attribute exists in _this.userDefinedAttributes_
		if(!this.userDefinedAttributes[this.selected.aresId]) {
			this.userDefinedAttributes[this.selected.aresId] = {};
		}
		
		if (originator.active === true) {
			row.$.attributeVal.setDisabled(false);
			
			// Add this attribute to the rendered instance
			this.userDefinedAttributes[this.selected.aresId][attribute] = row.$.attributeVal.getFieldValue();
		} else {
			row.$.attributeVal.setFieldValue(this.buildPropList(this.selected)[attribute]);
			row.$.attributeVal.setDisabled(true);
			delete this.userDefinedAttributes[this.selected.aresId][attribute];
			
			// Remove this attribute from the rendered instance in the iframe by setting it to _undefined_
			this.doModify({name: attribute, value: undefined});
		}
	}
});

enyo.kind({
	name: "Inspector.FilterLevel",
	events: {
		onValueChanged: ""
	},
	components: [
		{kind: "onyx.RadioGroup", fit:false, onActivate:"doValueChanged", style:"display:block;", controlClasses: "onyx-tabbutton inspector-tabbutton thirds", components: [
			{value: Model.F_USEFUL, content: "Frequent"},
			{value: Model.F_NORMAL, content: "Normal", active: true},
			{value: Model.F_DANGEROUS, content: "All"}
		]}
	]
});

enyo.kind({
	name: "Inspector.FilterType",
	events: {
		onValueChanged: ""
	},
	components: [
		{kind: "onyx.RadioGroup", fit:false, onActivate:"doValueChanged", style:"display:block;", controlClasses: "onyx-tabbutton inspector-tabbutton thirds", components: [
			{content:"Properties", value: "P", active:true},
			{content:"Events", value: "E"},
			{content:"Style", value: "S"}
		]}
	]
});

enyo.kind({
	name: "InheritCheckbox",
	kind: "enyo.Checkbox",
	published: {
		prop: null
	},
	handlers: {
		onActivate: "handleActivate"
	},
	allowActivate: false,
	rendered: function() {
		this.inherited(arguments);
		this.allowActivate = true;
	},
	//* Stop extraneous activate event from being fired when box is initially checked
	handleActivate: function(inSender, inEvent) {
		if(!this.allowActivate) {
			return true;
		}
	}
});

enyo.kind({
	name: "CategoryStyle",
	components: [
		{classes: "css-category", components: [
			{ontap:"toggleDrawer", classes: "css-category-name", components: [
				{name: "indicator", classes: "indicator turned"},
				{name: "name", tag:"span"}
			]},
			{name:"drawer", kind: "onyx.Drawer", open:true, components: [
				{name: "list", kind: "Repeater", onSetupItem: "setupItem", components: [
					{name: "styleItem", components: [
						{kind: "Control", classes: "css-item", components: [
							{name: "property", style: "width:0%"},
							{name: "textEditor", kind: "Inspector.Config.Text"},
							{name: "unit",content: "px or %"},
						]},
						{kind: "Control", classes: "css-item", components: [						
							{kind: "onyx.Slider", classes: "deimos-zoom-slider", value: 100, style: "width:80%",
									onChange: "sliderChanged", onChanging: "sliderChanging"}
						]},
					]},
				]}
			]}
		]}
	],
	cssType: {},
	toggleDrawer: function() {
		var open = this.$.drawer.getOpen();
		this.$.drawer.setOpen(!open);
		this.$.indicator.addRemoveClass("turned", !open);
	},
	setModel: function(inCssStyle, inControl) {
		this.cssType = inCssStyle;
		this.selected = inControl;
		this.$.name.setContent(inCssStyle.cssStyleName);	
		this.$.list.count = inCssStyle.properties.length;
		this.$.list.build();	
	},
	setupItem: function(inSender, inEvent) {
		var prop = this.cssType.properties[inEvent.index];
		inEvent.item.$.textEditor.setFieldName(prop);
		if ((this.selected.style) && (this.selected.style.indexOf(prop) !== 1)) {
			var str = (this.selected.style).split(";");
			for (i=0; i < str.length; i++) {
				if (str[i].indexOf(prop) > -1) {
					var p = str[i].split(":");
					for (i=0; i < p.length; i++) {
						var val = p[i].match(/\d+\.?\d*/g);
						inEvent.item.$.textEditor.setFieldValue(p[i]);	
					}
				}
			}
		}
		return true;
	},
	sliderChanging: function(inSender, inEvent) {
		//TODO
	},
	sliderChanged: function(inSender, inEvent) {
		//TODO
	}
});
