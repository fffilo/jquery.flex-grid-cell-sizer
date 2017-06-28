;(function($, window) {

    "use strict";

    /**
     * Constructor
     *
     * @todo:
     *     - resize columns with shift/ctrl
     *     - disabled element resizing
     *     - invisible columns
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
            var _ = this._;

            // already initialized
            if ($(this.element).data(_()))
                return;

            // init
            this.options = $.extend({}, this._defaults, this.options);
            this.element = $(this.element)
                .addClass(_())
                .data(_(), this);

            // ready
            this._recreate_handles();
            this.refresh();
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
                    .removeAttr("data-" + _())
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
            var size = $(that.element).outerWidth();
            var prec = that.options.precision;
            var current = 0;
            var result = [[]];

            // iterate columns
            $(that.columns)
                .each(function(i) {
                    var width = $(this).width();
                    current += width;

                    if (Math.round(current) > Math.round(size)) {
                        result.push([]);
                        current = width;
                    }

                    result[result.length - 1].push(that._convert(width, prec));
                });

            // remove empty row
            while (!result[result.length - 1].length)
                result.pop();

            return result;
        },

        /**
         * Get column width
         *
         * @param  {Number} index
         * @return {String}
         */
        width: function(index) {
            var width = $(this.columns).eq(index).width();
            if (typeof width === "undefined")
                return null;

            return this._convert(width, this.options.precision);
        },

        /**
         * Insert new column before index
         *
         * @param  {Number} index   position index
         * @param  {Mixed}  element DOM node, jQuery element or string selector
         * @return {Void}
         */
        insertBefore: function(index, element) {
            return this._alter_column("insertBefore", index, element);
        },

        /**
         * Insert new column after index
         *
         * @param  {Number} index   position index
         * @param  {Mixed}  element DOM node, jQuery element or string selector
         * @return {Void}
         */
        insertAfter: function(index, element) {
            return this._alter_column("insertAfter", index, element);
        },

        /**
         * Remove column
         *
         * @param  {Number} index
         * @return {Void}
         */
        remove: function(index) {
            return this._alter_column("remove", index);
        },

        /**
         * Split row on column
         *
         * @param  {Number} index
         * @return {Void}
         */
        split: function(index) {
            return this._alter_column("split", index);
        },

        /**
         * Join row on column
         *
         * @param  {Number} index
         * @return {Void}
         */
        join: function(index) {
            return this._alter_column("join", index);
        },

        /**
         * Normalize grid row
         * (set the same width to all columns in row)
         *
         * @param  {Number} index (optional)
         * @return {Void}
         */
        normalize: function(index) {
            var grid = this.grid();
            var result = $.extend(true, [], grid);
            var pos = this._column_grid_position(index);
            var width = $(this.element).width();

            // normalize
            if (typeof index === "undefined") {
                for (var y in result) {
                    for (var x in result[y]) {
                        result[y][x] = this._convert(width / result[y].length, this.options.precision);
                    }
                }
            }
            else {
                for (var x in result[pos.y]) {
                    result[pos.y][x] = this._convert(width / result[pos.y].length, this.options.precision);
                }
            }

            // concat results
            grid = [].concat.apply([], grid);
            result = [].concat.apply([], result);

            // set width
            var columns = this._differences(grid, result);
            if (!columns.length)
                return;

            // refresh grid
            this.refresh();

            // trigger change
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
            var grid = this.grid();
            var current = -1;
            var _ = this._;

            for (var row in grid) {
                for (var col in grid[row]) {
                    current++;

                    var $column = this.columns.eq(current);
                    var $resize = this.handles.resize.eq(current);
                    var width = $column.width();

                    $column
                        .width(this._convert(width, this.options.precision))
                        .css("max-width", "")
                        .attr("data-" + _("grid"), col + "," + row)
                        .removeClass(_("grid-last-row"))
                        .removeClass(_("grid-last-column"));

                    $resize
                        .attr("data-" + _("cell-size-column"), this._convert(width, this.options.displayPrecision))
                        .attr("data-" + _("cell-size-next"), this._convert($(this.columns).eq(current + 1).width(), this.options.displayPrecision))

                    if (row*1 + 1 === grid.length)
                        $column.addClass(_("grid-last-row"));
                    if (col*1 + 1 === grid[row].length)
                        $column.addClass(_("grid-last-column"));
                }
            }
        },

        /**
         * Refresh columns and recreate handles
         *
         * @return {Void}
         */
        _recreate_handles: function() {
            var that = this;
            var _ = that._;

            that.handles = {
                resize: $(null),
                split: $(null),
                join: $(null)
            }

            that.columns = $(that.element)
                .children(that.options.children)
                .addClass(_("cell"))
                .each(function() {
                    $(this)
                        .children("." + _("handle"))
                        .remove();

                    var $split = $("<a />")
                        .attr("href", "#")
                        .addClass(_("handle"))
                        .addClass(_("handle-split"))
                        .html("&#8629;")
                        .on("click." + _(), function(e) {
                            that._handle_split_click.call(that, e);
                        })
                        .appendTo(this);

                    var $join = $("<a />")
                        .attr("href", "#")
                        .addClass(_("handle"))
                        .addClass(_("handle-join"))
                        .html("&#8612;")
                        .on("click." + _(), function(e) {
                            that._handle_join_click.call(that, e);
                        })
                        .appendTo(this);

                    var $resize = $("<span />")
                        .addClass(_("handle"))
                        .addClass(_("handle-resize"))
                        .on("mousedown." + _(), function(e) {
                            that._handle_resize_mousedown.call(that, e);
                        })
                        .appendTo(this);

                    that.handles.split = $(that.handles.split)
                        .add($split);
                    that.handles.join = $(that.handles.join)
                        .add($join);
                    that.handles.resize = $(that.handles.resize)
                        .add($resize);
                });
        },

        /**
         * Split, join, remove or insert
         * new column before/after index.
         *
         * For split, join and remove action
         * element argument is ignored.
         *
         * For insert actions element must
         * be DOM node, jQuery element or
         * string selector (mandatory).
         *
         * @todo : refactor this
         *
         * @param  {String} action  split, join, remove, insertBefore or insertAfter
         * @param  {Number} index   column index
         * @param  {Mixed}  element (optional)
         * @return {Void}
         */
        _alter_column: function(action, index, element) {
            if (["split", "join", "remove", "insertBefore", "insertAfter"].indexOf(action) === -1)
                return;

            // element must exist on insert actions
            if (!$(element).length && ["insertBefore", "insertAfter"].indexOf(action) !== -1)
                return;

            // grid
            var grid = this.grid();
            var result = $.extend(true, [], grid);
            var pos = this._column_grid_position(index);
            if (!pos)
                return;

            // split action
            if (action === "split") {
                if (pos.x + 1 === grid[pos.y].length)
                    return;

                var arr = result[pos.y].splice(0, pos.x + 1);
                result.splice(pos.y, 0, arr);

                if (!result[pos.y + 1].length)
                    result.splice(pos.y + 1, 1);

                result[pos.y] = this._stretch(result[pos.y]);
                result[pos.y + 1] = this._stretch(result[pos.y + 1]);
            }

            // join action
            else if (action === "join") {
                if (pos.x !== 0 || pos.x === 0 && pos.y === 0)
                    return;

                result[pos.y - 1] = result[pos.y - 1].concat(result[pos.y])
                result.splice(pos.y, 1);

                result[pos.y - 1] = this._stretch(result[pos.y - 1]);
            }

            // remove action
            else if (action === "remove") {
                grid[pos.y].splice(pos.x, 1);
                result[pos.y].splice(pos.x, 1);

                result[pos.y] = this._stretch(result[pos.y]);
            }

            // insert actions
            else {
                var sum = 0;
                for (var i in result[pos.y]) {
                    sum += parseFloat(result[pos.y][i]);
                }
                var avg = sum / result[pos.y].length;

                var offset = pos.x + ("insertAfter" ? 1 : 0)
                grid[pos.y].splice(offset, 0, 0);
                result[pos.y].splice(offset, 0, avg);

                result[pos.y] = this._stretch(result[pos.y]);
            }

            // concat results
            grid = [].concat.apply([], grid);
            result = [].concat.apply([], result);

            // execute action
            if (action === "remove") {
                this.columns.eq(index)[action]();
                this._recreate_handles();
            }
            else if (["insertBefore", "insertAfter"].indexOf(action) !== -1) {
                $(element)[action](this.columns.eq(index));
                this._recreate_handles();
            }

            // set width
            var columns = this._differences(grid, result);
            if (!columns.length)
                return;

            // refresh grid
            this.refresh();

            // trigger change
            if (columns.length)
                this._trigger("change", {
                    target: this.element,
                    column: columns
                });
        },

        /**
         * Get column grid position
         *
         * @param  {Number} index
         * @return {Object}
         */
        _column_grid_position: function(index) {
            var $column = this.columns.eq(index);
            var attr = $column.attr("data-" + this._("grid"));
            if (!attr)
                return;
            var arr = attr.split(",");

            return {
                x: arr[0] * 1,
                y: arr[1] * 1
            }
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

            // calculate size
            var sum = 0;
            for (var i = 0; i < values.length; i++) {
                sum += parseFloat(values[i]);
            }

            // increase by avg value
            var avg = parseFloat(size) / sum;
            var current = 0;
            for (var i = 0; i < values.length; i++) {
                var val = parseFloat(values[i]) * avg;
                val = val.toFixed(prec);

                // fix decimal rounding problem
                if (i === values.length - 1)
                    val = (parseFloat(size) - current).toFixed(prec);

                result.push(val + unit);
                current += parseFloat(val);
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
         * Get columns with missmatched sizes
         * from grid arguments and set new
         * width
         *
         * @param  {Array} before
         * @param  {Array} after
         * @return {Array}
         */
        _differences: function(before, after) {
            var result = [];
            $(this.columns)
                .each(function(i) {
                    if (before[i] == after[i])
                        return true;

                    result.push({
                        element: this,
                        index: i,
                        size: {
                            before: before[i],
                            after: after[i]
                        }
                    });

                    $(this).width(after[i]);
                });

            return result;
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
         * Handle click event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_split_click: function(e) {
            this.split(this.handles.split.index(e.target));
            e.preventDefault();
        },

        /**
         * Handle click event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_join_click: function(e) {
            this.join(this.handles.join.index(e.target));
            e.preventDefault();
        },

        /**
         * Handle mousedown event handler
         *
         * @param  {Object} e
         * @return {Void}
         */
        _handle_resize_mousedown: function(e) {
            // left mouse button only
            if (e.which !== 1)
                return;

            var that = this;
            var index = $(that.handles.resize).index(e.target);
            var $element = $(that.element);
            var $column = $(that.columns).eq(index);
            var $next = $(that.columns).eq(index + 1);
            var $handle = $(that.handles.resize).eq(index);
            var _ = that._;

            // mouseup outside viewport fix
            if ($(this.element).data(_("event-data")))
                this._handle_resize_mouseup(e);

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
                    that._handle_resize_mousemove.call(that, e);
                })
                .on("mouseup." + _(), function(e) {
                    that._handle_resize_mouseup.call(that, e);
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
        _handle_resize_mousemove: function(e) {
            var _ = this._;
            var data = $(this.element)
                .data(_("event-data"));

            // save current position
            data.handle.mouse.current = e.pageX;

            // calculate drag offset and set column width
            var offset = data.handle.mouse.current - data.handle.mouse.start;
            $(data.next.element).width(0);
            $(data.column.element).width(data.column.size.start + offset);
            data.column.size.current = $(data.column.element).width();

            // re-calculate drag offset (element can have min-width/max-width) set handle
            offset = data.column.size.current - data.column.size.start;
            data.next.size.current = data.next.size.start - offset;
            $(data.next.element).width(data.next.size.current);

            // set handles.resize content
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
        _handle_resize_mouseup: function(e) {
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
