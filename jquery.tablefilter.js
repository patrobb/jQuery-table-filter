/**
	jQuery table filter plugin.  Add dynamic filtering based on data available in the table with this plugin.

	Parameters:
		selectorHeaders:  The jQuery selectors used to identify the headers of a table.  Default:  'thead th'
		selectorFilterRow:  The CSS class applied to to the table row <tr> that wraps the filter controls.  Default:  'filterRow'
		cssActive:  The CSS class that is applied to an active filter while it is in use.  Default:  'activeFilter'
		maxLength:  The string length of items where it switches from a <select> list of items to an <input type="text" /> box.  Default:  35
		maxItems:  The max number of items before the filter switches from a <select /> list of items to an <input type="text" /> box.  Default:  20
		lineSeperators:  Used to identify codes used to seperate items on the same record (if you have two years listed for example), using RegExp.  Default:  RegExp('<br>|<br />|<br/>|<BR>')

	Usage:
		Target the table you want to add filtering to and use the constructor.

		$('#myTableId').tablefilter();

		To modify the options, use the following:

		$('#myTableId').tablefilter({
			selectorHeaders: 'tr:first';
		});

	Written by Patrick Robb, 2013


**/

(function ($) {
	$.extend({
		tablefilter: new function () {
			var filters = [];

			this.defaults = {
				selectorHeaders: 'thead th',
				selectorFilterRow: 'filterRow',
				cssActive: 'activeFilter',
				maxLength: 35,
				maxItems: 20,
				lineSeperators: new RegExp('<br>|<br />|<br/>|<BR>')
			};

			function trimAndGetNodeText(node, config) {
				var ret = [];
				var val;
				if ($(node).val() != "") {
					val = $(node).val();
				}
				else {
					val = $.trim(node.innerHTML);
				}

				$.each(val.split(config.lineSeperators), function (i, v) {
					ret.push($.trim(v));
				});

				return ret;
			}

			function createFilter(table, filter) {

				if (filter.values.length > table.config.maxItems || filter.maxItemLength > table.config.maxLength) {
					filter.input = true;
				}

				filter.filterControl = $();

				if (filter.input) {
					filter.filterControl = $('<input type="text" value="" />')
						.bind('keyup', function () {
							filter.selValue = $(this).val();
							runFilter(table, filter);
						});
				}
				else {
					filter.filterControl = $('<select></select>')
						.append($('<option>All</option>'))
						.append($('<option>Not Empty</option>'))
						.append($('<option>Empty Only</option>'));

					filter.selValue = "All";

					$.each(filter.values, function (i, val) {
						filter.filterControl.append($('<option>' + val + '</option>'));
					});

					filter.filterControl.change(function () {
						filter.selValue = $(this).val();
						runFilter(table, filter);
					});
				}

				return filter.filterControl;
			}

			function runFilter(table, filter) {
				var vt = $(table);
				vt.trigger("filterStart");

				if (filter.input) {
					clearTimeout(filter.filterTimeout);
					filter.filterTimeout = setTimeout(function () {
						vt.find(filter.cellSelector).each(function (rowIndex, cell) {
							var parent = $(cell).parent('tr');
							var strValue = new String(cell.innerHTML).toLowerCase();
							if (strValue.search(filter.selValue.toLowerCase()) != -1) {
								// This is a match for the filter, so we display this row, if no other filters override it
								if (parent.hasClass(filter.rowSelector)) {
									parent.removeClass(filter.rowSelector);
								}
							}
							else {
								// This is not a match, so we hide this row
								if (!parent.hasClass(filter.rowSelector)) {
									parent.addClass(filter.rowSelector);
								}
							}
						});

						updateFilters(table);
					}, 1000);
				}
				else {
					vt.find(filter.cellSelector).each(function (rowIndex, cell) {
						var parent = $(cell).parent('tr');
						var cellVal = trimAndGetNodeText(cell, table.config);
						var show = false;

						$.each(cellVal, function (i, val) {
							if (filter.selValue == val || filter.selValue == "All") {
								show = true;
							}
							if (filter.selValue == "Not Empty" && val != "") {
								show = true;
							}
							if (filter.selValue == "Empty Only" && val == "") {
								show = true;
							}
						});

						if (show) {
							// This is a match for the filter, so we display this row, if no other filters override it
							if (parent.hasClass(filter.rowSelector)) {
								parent.removeClass(filter.rowSelector);
							}
						}
						else {
							// This is not a match, so we hide this row
							if (!parent.hasClass(filter.rowSelector)) {
								parent.addClass(filter.rowSelector);
							}
						}
					});
					updateFilters(table);
				}
			}

			function updateFilters(table) {
				var filterList = "";
				$.each(filters, function (i, filter) {

					filterList += '.' + filter.rowSelector;
					if (i = filters.length - 1) {
						filterList += ',';
					}
				});

				$(table).find(filterList).filter(':visible').hide();
				$(table).find('tbody tr').not(filterList).show();

				$(table).trigger("filterEnd");
			}

			this.construct = function (settings) {
				return this.each(function () {
					if (!this.tHead || !this.tBodies) return;

					var table = this;

					var $this = $(table);
					table.config = $.extend(table.config, $.tablefilter.defaults, settings);

					filters = [];

					// get rid of the existing filter section
					if ($this.find("." + table.config.selectorFilterRow).length > 0) {
						$this.find("." + table.config.selectorFilterRow).remove();
					}

					var filterRow = $('<tr class="' + table.config.selectorFilterRow + '"></tr>');

					$.each($this.find(this.config.selectorHeaders), function (i, cell) {
						if (!$(cell).hasClass('noFilter')) {
							var newFilter = {
								index: i + 1,
								maxItemLength: 0,
								cellSelector: 'tbody tr td:nth-child(' + (i + 1) + ')',
								filterControl: $(),
								values: [],
								input: false,
								filterTimeout: 0,
								selValue: '',
								rowSelector: 'filter' + i
							};
							// Get a list of all the items in this column, and then work through it.

							$this.find(newFilter.cellSelector).each(function () {
								var val = trimAndGetNodeText(this, table.config);

								$.each(val, function (k, value) {
									if ($.inArray(value, newFilter.values) == -1) {
										if (value.length > newFilter.maxItemLength) newFilter.maxItemLength = value.length;
										newFilter.values.push(value);
									}
								});
							});

							if (newFilter.values.length > 4) {
								newFilter.filterControl = createFilter(table, newFilter);
								newFilter.filterControl.width($(cell).width()).css('font-size', 'smaller');
								filters.push(newFilter);
								var filterCell = $('<td></td>').append(newFilter.filterControl);
								filterRow.append(filterCell);
							}
							else {
								filterRow.append($('<td class="noFilter"></td>'));
							}
						}
						else {
							filterRow.append($('<td class="noFilter"></td>'));
						}
					});

					$this.find('thead').append(filterRow);
				});
			}
		}
	});

	$.fn.extend({
		tablefilter: $.tablefilter.construct
	});


})(jQuery);
