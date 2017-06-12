;(function($, window) {

    "use strict";

    /**
     * Constructor
     *
     * @param {Object} element HTML node
     * @param {Object} options see FlexGridCellSizer.prototype._defaults
     * @return {Void}
     */
    var FlexGridCellSizer = function(element, options) {
        this.element = element;
        this.columns = null;
        this.handles = null;
        this.options = options;

        this.init();
    }

    /**
     * FlexGridCellSizer prototype
     *
     * @type {Object}
     */
    FlexGridCellSizer.prototype = {

        /**
         * Default options
         *
         * @type {Object}
         */
        _defaults: {
            children: "*",
            precision: 4,
            displayPrecision: 1,
            displayUnit: true,
            unit: "%"
        },

        /**
         * Get class/event name
         *
         * @param  {String}  str
         * @param  {Boolean} nodash (optional)
         * @return {String}
         */
        _: function(str, nodash) {
            var result = "jquery-flex-grid-cell-sizer"
                + (str ? "-" : "")
                + (str || "");
            if (nodash)
                result = result.replace(/\-/g, "");

            return result;
        },

        /**
         * Initialize
         *
         * @return {Void}
         */
        init: function() {
            var that = this;
            var _ = that._;

            // already initialized
            if ($(this.element).data(_()))
                return;

            // init
            that.options = $.extend({}, that._defaults, that.options);
            that.element = $(that.element)
                .addClass(_())
                .data(_(), that);

            // create handles
            that.handles = $(null);
            that.columns = $(that.element)
                .children(that.options.children)
                .addClass(_("cell"))
                .each(function() {
                    var $handle = $("<div />")
                        .addClass(_("handle"))
                        .on("mousedown." + _(), function(e) {
                            that._handle_mousedown.call(that, e);
                        })
                        .appendTo(this);

                    that.handles = $(that.handles)
                        .add($handle);
                });

            // ready
            that.refresh();
        },

        /**
         * Destructor
         *
         * @return {Void}
         */
        destroy: function() {
            var _ = this._;

            $(this.element)
                .removeClass(_())
                .removeData(_())
                .off("." + _())
                .children("." + _("cell"))
                    .removeClass(_("cell"))
                    .children("." + _("handle"))
                        .remove();

            $(window)
                .off("." + _());
        },

        /**
         * Get column sizes as array
         *
         * @return {Array}
         */
        grid: function() {
            var that = this;
            var result = [[]];

            // iterate columns
            $(that.columns)
                .each(function(i) {
                    var width = $(this).width();
                    var size = that._convert(width, that.options.precision)

                    result[result.length - 1].push(size);

                    if ($(this).hasClass("flex-grid-break"))
                        result.push([]);
                });

            // remove empty row
            while (!result[result.length - 1].length)
                result.pop();

            return result;
        },

        /**
         * Enable, disable or get state
         * of resizer
         *
         * @param  {Boolean} state (optional)
         * @return {Mixed}
         */
        enabled: function(state) {
            if (typeof state === "undefined")
                return !$(this.element).hasClass("jquery-flex-grid-cell-sizer-disabled");

            $(this.element)
                .removeClass("jquery-flex-grid-cell-sizer-disabled")
                .addClass(state ? "_temp" : "jquery-flex-grid-cell-sizer-disabled")
                .removeClass("_temp");
        },

        /**
         * Get/set column break
         *
         * @param  {Number}  index
         * @param  {Boolean} state (optional)
         * @return {Mixed}
         */
        columnBreak: function(index, state) {
            if (typeof state === "undefined")
                return this.columns.eq(index).hasClass("flex-grid-break");

            // state not changed
            if (state == this.columnBreak(index))
                return;

            // index out of range and last column is always in break state
            if (index < 0 || index >= this.columns.length - 1)
                return;

            // get grid
            var row = this._row_of_column(index);
            var col = this._columns_in_row(row);
            var grid = this.grid();
            var result = $.extend(true, [], grid);

            // find column in row
            var start;
            for (var i in col) {
                if (col[i] == index) {
                    start = i * 1;
                    break
                }
            }

            // split
            if (state) {
                var arr = result[row].splice(0, start + 1);
                result.splice(row, 0, arr);
            }

            // join
            else {
                result[row] = result[row].concat(result[row + 1])
                result.splice(row + 1, 1);
            }

            // fix widths
            if (row < result.length)
                result[row] = this._stretch(result[row]);
            if (row + 1 < result.length)
                result[row + 1] = this._stretch(result[row + 1]);

            // concat results
            grid = [].concat.apply([], grid);
            result = [].concat.apply([], result);

            // set widths
            var columns = [];
            $(this.columns)
                .each(function(i) {
                    if (grid[i] != result[i]) {
                        columns.push({
                            element: this,
                            index: i,
                            size: {
                                before: grid[i],
                                after: result[i]
                            }
                        });

                        $(this).width(result[i]);
                    }
                });

            // refresh
            this.refresh();

            // trigger changes
            if (columns.length)
                this._trigger("change", {
                    target: this.element,
                    column: columns
                });
        },

        /**
         * Refresh
         *
         * @return {Void}
         */
        refresh: function() {
            this._refresh_break();
            this._refresh_columns();
            this._refresh_handles();
        },

        /**
         * Add break class to cell element
         *
         * @return {Void}
         */
        _refresh_break: function() {
            var that = this;
            var total = $(that.element).outerWidth();
            var current = 0;

            $(that.columns)
                .removeClass("flex-grid-break")
                .each(function(i) {

                    if ($(this).hasClass("flex-grid-hidden"))
                        return;

                    var width = $(this).width();
                    current += width;

                    if (Math.round(current) > Math.round(total)) {
                        $(that.columns)
                            .eq(i - 1)
                                .addClass("flex-grid-break");

                        current = width;
                    }
                })
                .last()
                    .addClass("flex-grid-break");
        },

        /**
         * Convert column sizes from px to options.units
         *
         * @return {Void}
         */
        _refresh_columns: function() {
            var that = this;
            var prec = that.options.precision;
            var size = $(this.element).outerWidth();
            var row = 0;

            $(that.columns)
                .each(function() {
                    var width = $(this).width();
                    row += width;

                    if ($(this).hasClass("flex-grid-break")) {
                        width = size - (row - width);
                        row = 0;
                    }

                    $(this)
                        .width(that._convert(width, prec))
                })
                .css("max-width", "");
        },

        /**
         * Set size in handles content
         * (::before and ::after pseudo elements)
         *
         * @return {Void}
         */
        _refresh_handles: function() {
            var that = this;
            var prec = that.options.displayPrecision;
            var _ = that._;

            $(this.handles)
                .each(function(i) {
                    $(this)
                        .attr("data-" + _("cell-size-column"), that._convert($(that.columns).eq(i).width(), prec))
                        .attr("data-" + _("cell-size-next"), that._convert($(that.columns).eq(i + 1).width(), prec));
                });
        },

        /**
         * Increase/decrease sizes to fit
         * 100% width
         *
         * @param  {Array} values
         * @return {Array}
         */
        _stretch: function(values) {
            var width = $(this.element).width();
            var prec = this.options.precision;
            var unit = this.options.unit;
            var size = this._convert(width, prec);
            var result = [];

            var sum = 0;
            for (var i = 0; i < values.length; i++) {
                sum += parseFloat(values[i]);
            }

            var inc = parseFloat(size) / sum;
            for (var i = 0; i < values.length; i++) {
                result.push((parseFloat(values[i]) * inc).toFixed(prec) + unit);
            }

            return result;
        },

        /**
         * Get row index of column
         *
         * @param  {Number} index
         * @return {Number}
         */
        _row_of_column: function(index) {
            var grid = this.grid();
            var count = -1;
            var result = null;

            for (var row in grid) {
                for (var col in grid[row]) {
                    count += 1;

                    if (count == index) {
                        result = row * 1;
                        break;
                    }
                }

                if (result !== null)
                    break;
            }

            return result;
        },

        /**
         * Get column indexes of row
         *
         * @param  {Number} index
         * @return {Array}
         */
        _columns_in_row: function(index) {
            var grid = this.grid();
            var start = 0;
            var result = [];

            // find starting column index
            for (var i = 0; i < index; i++) {
                start += grid[i].length;
            }

            // append row columns
            for (var i = 0; i < grid[index].length; i++) {
                result.push(start);
                start++;
            }

            return result;
        },

        /**
         * Convert size from px to options.unit
         *
         * @param  {Numeric} width
         * @param  {Numeric} precision
         * @return {Numeric}
         */
        _convert: function(width, precision) {
            var unit = this.options.unit;
            var suffix = this.options.displayUnit ? unit : "";
            width = parseFloat(width);

            if (unit === "%") {
                return (width / $(this.element).outerWidth() * 100).toFixed(precision) + suffix;
            }
            else if (unit === "em") {
                return (width / parseFloat($(this.element).css("font-size"))).toFixed(precision) + suffix;
            }
            else if (unit === "rem") {
                return (width / parseFloat($("body").css("font-size"))).toFixed(precision) + suffix;
            }

            return width.toFixed(precision) + (this.options.displayUnit ? "px" : "");
        },

        /**
         * Emit event
         *
         * @param  {String} event event name
         * @param  {Object} data  (optional) additional data
         * @return {Void}
         */
        _trigger: function(event, data) {
            var that = this;
            var _ = that._;

            $(that.element)
                .trigger(that._(event, true), data);
        },

        /**
         * Handle mousedown event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_mousedown: function(e) {
            // left mouse button only
            if (e.which !== 1)
                return;

            var that = this;
            var index = $(that.handles).index(e.target);
            var $element = $(that.element);
            var $column = $(that.columns).eq(index);
            var $next = $(that.columns).eq(index + 1);
            var $handle = $(that.handles).eq(index);
            var _ = that._;

            // mouseup outside viewport fix
            if ($(this.element).data(_("event-data")))
                this._handle_mouseup(e);

            // event data
            var data = {
                target: {
                    element: $element.get(0),
                    index: null,
                    size: $element.outerWidth()
                },
                column: {
                    element: $column.get(0),
                    index: index,
                    size: {
                        start: $column.width(),
                        current: null,
                        stop: null
                    }
                },
                next: {
                    element: $next.get(0),
                    index: index + 1,
                    size: {
                        start: $next.width(),
                        current: null,
                        stop: null
                    }
                },
                handle: {
                    element: $handle.get(0),
                    index: index,
                    mouse: {
                        start: e.pageX,
                        current: null,
                        stop: null
                    }
                }
            }
            $(data.target.element)
                .data(_("event-data"), data);

            // max-width column
            $(data.column.element)
                .css("max-width", $(data.column.element).width() + $(data.next.element).width() - (parseFloat($(data.next.element).css("min-width")) || 0));

            // set width in px
            $(data.column.element)
                .width($(data.column.element).width() + "px");
            $(data.next.element)
                .width($(data.next.element).width() + "px");

            // add class to display handle/cursor
            $("html")
                .add(data.handle.element)
                    .addClass(_("dragging"));

            // bind mouse events on window
            $(window)
                .on("mousemove." + _(), function(e) {
                    that._handle_mousemove.call(that, e);
                })
                .on("mouseup." + _(), function(e) {
                    that._handle_mouseup.call(that, e);
                });

            // trigger start event
            this._trigger("dragstart", data);

            e.preventDefault();
        },

        /**
         * Window mousemove event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_mousemove: function(e) {
            var _ = this._;
            var data = $(this.element)
                .data(_("event-data"));

            // save current position
            data.handle.mouse.current = e.pageX;

            // to do: shift/ctrl?

            // calculate drag offset and set column width
            var offset = data.handle.mouse.current - data.handle.mouse.start;
            $(data.next.element).width(0);
            $(data.column.element).width(data.column.size.start + offset);
            data.column.size.current = $(data.column.element).width();

            // re-calculate drag offset (element can have min-width/max-width) set handle
            offset = data.column.size.current - data.column.size.start;
            data.next.size.current = data.next.size.start - offset;
            $(data.next.element).width(data.next.size.current);

            // set handles content
            var prec = this.options.displayPrecision;
            $(data.handle.element)
                .attr("data-" + _("cell-size-column"), this._convert(data.column.size.current, prec))
                .attr("data-" + _("cell-size-next"), this._convert(data.next.size.current, prec));

            // trigger move event
            this._trigger("dragmove", data);
        },

        /**
         * Window mouseup event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_mouseup: function(e) {
            var _ = this._;
            var unit = this.options.unit;
            var data = $(this.element)
                .data(_("event-data"));

            // save position and size
            data.handle.mouse.stop = e.pageX;
            data.column.size.stop = data.column.size.current;
            data.next.size.stop = data.next.size.current;

            // remove data and unbind mouse events on window
            $(window)
                .off("mousemove." + _())
                .off("mouseup." + _());

            // remove class
            $("html")
                .add(data.handle.element)
                    .removeClass(_("dragging"));

            // refresh
            this.refresh();

            // clear event data
            $(data.target.element)
                .removeData(_("event-data"));

            // trigger stop event
            this._trigger("dragstop", data);

            // trigger change
            if (data.column.size.stop && data.column.size.stop !== data.column.size.start) {
                var unit = this.options.unit;
                var prec = this.options.precision;

                this._trigger("change", {
                    target: this.element,
                    column: [
                        {
                            element: data.column.element,
                            index: data.column.index,
                            size: {
                                before: this._convert(data.column.size.start, prec),
                                after: this._convert(data.column.size.stop, prec)
                            }
                        },
                        {
                            element: data.next.element,
                            index: data.next.index,
                            size: {
                                before: this._convert(data.next.size.start, prec),
                                after: this._convert(data.next.size.stop, prec)
                            }
                        }
                    ]
                });
            }
        }

    }

    // jQuery plugin
    $.fn.flexGridCellSizer = function(options) {

        var too = Object.prototype.toString.call(options).split(" ")[1].slice(0, -1);
        var arg = arguments;
        var err = function(msg) {
            throw "FlexGridCellSizerException: " + msg;
        }

        // init FlexGridCellSizer instance
        if (too === "Object" || too === "Undefined" || options === "init") {
            return $(this)
                .each(function() {
                    new FlexGridCellSizer(this, options);
                });
        }

        // execute method
        else if (too === "String" && options.substr(0,1) !== "_" && options in FlexGridCellSizer.prototype) {
            var result;
            $(this)
                .each(function() {
                    var instance = $(this).data(FlexGridCellSizer.prototype._.call(this));
                    if (!(instance instanceof FlexGridCellSizer))
                        err("instance not initialized.");

                    result = instance[options].apply(instance, Array.prototype.slice.call(arg, 1));
                });

            return typeof result === "undefined" ? this : result;
        }

        // invalid method
        else if (too === "String") {
            err("invalid method name '" + options + "'.");
        }

        // invalid argument type
        err("invalid argument type '" + too + "'.");

    }

})(jQuery, window);
