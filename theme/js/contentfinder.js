var ContentFinder = function(id, search_callback, select_callback, multiselect) {
    // id may be a string, a dom element or a jquery.
    var self = this;
    self.container = $(id);
    self.multiselect = multiselect || false;
    self.activeresults = [];
    self.selecteditems = [];
    self.selectedresults = []; // Only used for multi-select
    self.choices = $('.finder-choices', self.container);
    self.dropdown = $('.finder-dropdown', self.container);
    self.results = $('.finder-results', self.container);
    self.input = $('.search-field input', self.container);
    self.input_timeout = null;
    self.input.attr('value', self.input.attr('data-placeholder'));
    // self.single_backstroke_delete = this.options.single_backstroke_delete || false;
    self.single_backstroke_delete = false;
    self.search_callback = search_callback;
    self.select_callback = select_callback || (function(){});
    self.opened = false;


    self.open_dropdown = function() {
        if (self.input.attr('value') === self.input.attr('data-placeholder')) {
            self.input.attr('value', '');
        }
        self.input.focus();
        self.dropdown.css({'left': 0});
        self.opened = true;
    };
    self.close_dropdown = function(focus) {
        focus = (focus === undefined)?true:Boolean(focus);
        self.opened = false;
        if (self.input.attr('value') === '') {
            self.input.attr('value', self.input.attr('data-placeholder'));
        }
        if(focus){ self.input.focus(); }
        self.dropdown.css({'left': -9000});
    };

    var keyboard_navigation = function (evt) {
        if (evt.target === self.input[0]) {
            switch(evt.keyCode){

                case 8:
                    var backstroke_length = self.input.val().length;
                    if (self.multiselect && backstroke_length < 1 && 
                        self.selecteditems.length > 0) {
                        return self.keydown_backstroke();
                    } else {
                        return true; // prevent the evt.preventDefault below.
                    }
                    break;

                case 40:
                    // arrow down
                    self.open_dropdown(evt);
                    if ($('.LSHighlight', self.results).length === 0) {
                        // highlight the first item in the list
                        self.results.children()
                            .first()
                            .addClass('LSHighlight');
                    } else {
                        // highlight the next item in the list
                        $('.LSHighlight', self.results)
                            .first()
                            .removeClass('LSHighlight')
                            .next()
                            .addClass('LSHighlight');
                    }
                    break;

                case 38:
                    // arrow up
                    if ($('.LSHighlight', self.results).length === 0) {
                        // highlight the last item in the list
                        self.results.children()
                            .last()
                            .addClass('LSHighlight');
                    } else {
                        // highlight the previous item in the list
                        $('.LSHighlight', self.results)
                            .first()
                            .removeClass('LSHighlight')
                            .prev()
                            .addClass('LSHighlight');
                    }
                    break;


                case 39:
                case 13:
                    // select item on Enter or right-arrow
                    if ($('.LSHighlight', self.results).length !== 0) {
                        $('.LSHighlight', self.results)
                            .first()
                            .click();
                    } else if (self.input.val()) {
                        self.close_dropdown(false);
                        self.select_callback(self.input.val());
                    }
                    break;

                case 27:
                    // close dropdown on Escape
                    self.close_dropdown();
                    break;


                default:
                    // On typing, open the dropdown if it is closed
                    if (!self.opened){ self.open_dropdown(); }
                    // Kill any pending search if new keys arrive
                    if (self.input_timeout !== null){
                        clearTimeout(self.input_timeout);
                        self.input_timeout = null;
                    }
                    // Give the user half a second to type more of the search
                    // term
                    self.input_timeout = setTimeout(function(){
                        if(self.input.val().length > 0){
                            self.search(self.input.val());
                        }
                    }, 500);
                    // Skip the preventDefault below.
                    return true;
            }
            evt.preventDefault();
        }
    };
    self.choices.on('click', function(e){
        e.preventDefault();
        self.opened && self.close_dropdown() || self.open_dropdown();
    }).keydown(keyboard_navigation);

    // Delegated events, this way we need only attach one handler
    self.results.on('click', 'li.not-folderish', function(e){
        e.preventDefault();
        self.result_click($(this));
    });

    self.container.on('click', 'li.folderish', function(e){
        e.preventDefault();
        self.listdir($(this).data('uid'));
    });

    self.container.on('click', 'a.open-folder', function(e){
        e.preventDefault();
        self.listdir($(this).parent().data('uid'));
    });

    self.container.on('click', '.internalpath a', function(e){
        e.preventDefault();
        self.listdir($(this).attr('data-uid'));
    });

    // Remove items from choice box if you click the X
    self.choices.on('click', 'a.search-choice-close', function(e){
        self.choice_destroy($(this));
        e.preventDefault(); e.stopPropagation();
    });
};

ContentFinder.prototype.selected_uids = function() {
    var uids = [];
    for (var i=0; i<this.selecteditems.length; i++) {
        var selected = this.selecteditems[i];
        uids.push(selected.uid);
    }
    return uids;
};

ContentFinder.prototype.listdir = function(id) {
    var self = this;
    self.search_callback(id).then(function(response){
        self._listdir(response.data);
    }, function(){
        alert('Cannot list folder contents');
    });
}

ContentFinder.prototype.search = function(search){
    var self = this;
    self.search_callback(null, search).then(function(response){
        self._listdir(response.data);
    }, function(){
        alert('Cannot search');
    });
}

ContentFinder.prototype._listdir = function(data) {
    var self = this,
        $html = $(),
        selected, result, len;

    self.data = data;
    // create the list of items to choose from
    for (var i=0; i<self.data.items.length; i++) {
        var item = self.data.items[i];
        selected = $.inArray(item.uid, self.selected_uids()) !== -1;
        var selected_class = selected ? ' selected ' : '';
        if (item.folderish) {
            var $item = $('<span>')
                .addClass('contenttype-' + item.normalized_type)
                .text(item.title)
                .appendTo('<li>').parent() // up to li container
                .addClass('active-result folderish')
                .data('uid', item.uid)
                .addClass(selected && 'selected' || '');

            $html = $html.add($item)
        } else {
            var $item = $('<span>')
                .addClass('contenttype-' + item.normalized_type)
                .text(item.title)
                .appendTo('<li>').parent() // up to li container
                .addClass('active-result not-folderish')
                .data('uid', item.uid)
                .addClass(selected && 'selected' || '');

            $html = $html.add($item)
        }
    }
    this.results.empty().append($html);

    /* rebuild the list of selected results
       this is necessary since selecteditems contains items selected
       across all folders
    */
    if (self.multiselect){
        self.selectedresults = [];
        for (i=0; i<self.selecteditems.length; i++) {
            var selected = self.selecteditems[i];
            self.dropdown.find('li').each(function(){
                if ($(this).data('uid') == selected.uid) {
                    self.selectedresults.push($(this));
                }
            });
        }
    }

    // breadcrumbs
    html = [];
    len = self.data.path.length;
    $.each(self.data.path, function (i, item) {
        if (i > 0) {
            html.push(" / ");
        }
        //html.push(item.icon);
        if (i === len - 1) {
            html.push('<span>' + item.title + '</span>');
        } else {
            html.push('<a href="#" data-uid="' + item.uid + '">' + item.title + '</a>');
        }
    });
    $('.internalpath', this.container).html(html.join(''));
};

ContentFinder.prototype.select_item = function(uid) {
    var self = this, item;
    for (var i=0; i<self.data.items.length; i++) {
        item = self.data.items[i];
        if (item.uid === uid) {
            self.selecteditems.push(item);
            self.select_callback(item);
            break;
        }
    }
};

ContentFinder.prototype.deselect_item = function(uid) {
    var self = this, lst = [], item;
    for (var i=0; i<self.selecteditems.length; i++) {
        item = self.selecteditems[i];
        if (item.uid !== uid) {
            lst.push(item);
        }
    }
    self.selecteditems = lst;
};

ContentFinder.prototype.clear_selection = function() {
    $('.search-choice', this.choices).remove();
    this.selecteditems = [];
    this.select_callback(null);
};

ContentFinder.prototype.result_click = function(item) {
    var self = this,
        selected, i, html = [];
    if (!self.multiselect) {
        self.dropdown.find('.selected').removeClass('selected');
        self.clear_selection();
        item.addClass('selected');
        self.close_dropdown();
        self.select_item(item.data('uid'));
        self.input.val('');
    } else {
        // remove item from list if it was deselected
        if (item.hasClass('selected')) {
            var new_lst = [];
            for (i=0; i<self.selectedresults.length; i++) {
                selected = self.selectedresults[i];
                if (selected.data('uid') === item.data('uid')) {
                    selected.removeClass('selected');
                    self.deselect_item(selected.data('uid'));
                } else {
                    new_lst.push(selected);
                }
            }
            self.selectedresults = new_lst;
        } else {
            self.selectedresults.push(item);
            self.select_item(item.data('uid'));
            item.addClass('selected');
        }
        self.input.focus();
    }
    self.update_selection();
};

ContentFinder.prototype.update_selection = function(){
    // repaints the search input to include items in selecteditems
    $html = $();
    for (i=0; i < this.selecteditems.length; i++) {
        var j = this.selecteditems[i];
        var $li = $('<span>').addClass('selected-resource').text(j.title)
            .add('<a>').last() // anchor sibling
            .addClass('search-choice-close').attr('rel', 3).end() // back to span
            .appendTo('<li>').parent()
            .addClass('search-choice').attr('title', j.title)
            .data('uid', j.uid);

        $html = $html.add($li);
    }
    $('.search-choice', this.choices).remove();
    this.choices.prepend($html);
    this.resize();
};

ContentFinder.prototype.choice_destroy = function(link) {
    var uid = link.parent().data('uid');
    link.parent().remove();
    this.deselect_item(uid);
    this.resize();
    // When nothing is selected, communicate that to the powers above.
    if (!this.selecteditems.length) { this.select_callback(null); }
};

ContentFinder.prototype.keydown_backstroke = function() {
    var next_available_destroy;
    if (this.pending_backstroke) {
        this.choice_destroy(this.pending_backstroke.find("a").first());
        return this.clear_backstroke();
    } else {
        next_available_destroy = $("li.search-choice", this.choices).last();
        if (next_available_destroy.length && !next_available_destroy.hasClass("search-choice-disabled")) {
            this.pending_backstroke = next_available_destroy;
            if (this.single_backstroke_delete) {
                return this.keydown_backstroke();
            } else {
                return this.pending_backstroke.addClass("search-choice-focus");
            }
        }
    }
};

ContentFinder.prototype.clear_backstroke = function() {
    if (this.pending_backstroke) {
    this.pending_backstroke.removeClass("search-choice-focus");
    }
    return this.pending_backstroke = null;
};

ContentFinder.prototype.resize = function() {
    var dd_top = this.container.height();
    this.dropdown.css({
        "top": dd_top + "px"
    });
};
