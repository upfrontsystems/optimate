var ContentFinder = function(id, callback, multiselect) {
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
    self.input.attr('value', self.input.attr('data-placeholder'));
    // self.single_backstroke_delete = this.options.single_backstroke_delete || false;
    self.single_backstroke_delete = false;
    self.callback = callback;
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
                        // Do a search
                        self.search(self.input.val());
                    }
                    break;

                case 27:
                    // close dropdown on Escape
                    self.close_dropdown();
                    break;


                default:
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

    self.container.on('mouseenter', 'a.open-folder .arrow', function(e){
        $(this).attr('class', 'arrow right-arrow-active');
    }).on('mouseleave', 'a.open-folder .arrow', function(e){
        $(this).attr('class', 'arrow right-arrow');
    });

    self.container.on('click', '.internalpath a', function(e){
        e.preventDefault();
        self.listdir($(this).attr('data-uid'));
    });

    // Remove items from choice box if you click the X
    self.choices.on('click', 'a.search-choice-close', function(e){
        self.choice_destroy($(this));
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
    self.callback(id).then(function(response){
        self._listdir(response.data);
    }, function(){
        alert('Cannot list folder contents');
    });
}

ContentFinder.prototype.search = function(search){
    var self = this;
    self.callback(null, search).then(function(response){
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
            var $item = $('<div>').addClass('arrow right-arrow') // nested div
                .appendTo('<a>').parent() // up to containing anchor
                .addClass('open-folder')
                .add('<span>').last() // span sibling
                .addClass('contenttype-' + item.normalized_type)
                .text(item.title).end() // back to anchor
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
};

ContentFinder.prototype.result_click = function(item) {
    var self = this,
        selected, i, html = [];
    if (!self.multiselect) {
        self.dropdown.find('.selected').removeClass('selected');
        self.clear_selection();
        item.addClass('selected');
        self.select_item(item.data('uid'));
        self.close_dropdown();
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
    }

    // add selections to search input
    for (i=0; i < this.selecteditems.length; i++) {
        item = this.selecteditems[i];
        html.push('<li class="search-choice" title="' + item.title + '"><span class="selected-resource">' + item.title + '</span><a href="javascript:void(0)" class="search-choice-close" rel="3" data-uid="' + item.uid + '"></a></li>');        
    }
    $('.search-choice', self.choices).remove();
    self.choices.prepend(html.join(''));
    self.input.focus();

    self.resize();
};

ContentFinder.prototype.choice_destroy = function(link) {
    var self = this,
        uid = link.attr('data-uid');
    link.parent().remove();
    el = $('li.active-result[data-uid="' + uid + '"]');
    // only trigger result_click if the selected item is in the
    // of selected results
    if (el.length === 0) {
        self.deselect_item(uid);
        self.resize();
    }
    else {
        self.result_click(el);
    }
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
