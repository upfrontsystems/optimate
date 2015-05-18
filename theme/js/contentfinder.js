/*global finderdata:false*/ /* <- not sure if this is still valid */

var finderdata = {}

var ContentFinder = function(id, path, multiselect) {
    var self = this;
    self.id = id;
    self.container = $(id);
    self.multiselect = false; //multiselect;
    self.activeresults = [];
    self.selecteditems = [];
    self.selectedresults = [];
    self.choices = $('.finder-choices', self.container);
    self.dropdown = $('.finder-dropdown', self.container);
    self.results = $('.finder-results', self.container);
    self.input = $('.search-field input', self.container);
    self.input.attr('value', self.input.attr('data-placeholder'));
    // self.single_backstroke_delete = this.options.single_backstroke_delete || false;
    self.single_backstroke_delete = false;


    var open_dropdown = function(e) {
        var tagName = $(e.target).prop('tagName');
        if (tagName === 'UL' || tagName === 'INPUT') {
            if (self.input.attr('value') === self.input.attr('data-placeholder')) {
                self.input.attr('value', '');
            }
            self.input.focus();
            self.dropdown.css({'left': 0});
        }
    };
    var close_dropdown = function(e) {
        var tagName = $(e.target).prop('tagName');
        if (tagName === 'UL' || tagName === 'INPUT') {
            if (self.input.attr('value') === '') {
                self.input.attr('value', self.input.attr('data-placeholder'));
            }
            self.input.focus();
            self.dropdown.css({'left': -9000});
        }
    };

    var keyboard_navigation = function (evt) {
        if (evt.target === self.input[0]) {
            switch(evt.keyCode){

                case 8:
                    var backstroke_length = self.input.val().length;
                    if (self.multiselect && backstroke_length < 1 && 
                        self.selecteditems.length > 0) {
                        return self.keydown_backstroke();
                    }
                    break;

                case 40:
                    // arrow down
                    open_dropdown(evt);
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

                case 13:
                    // select item on Enter
                    if ($('.LSHighlight', self.results).length !== 0) {
                        $('.LSHighlight', self.results)
                            .first()
                            .click();
                    }
                    break;

                case 27:
                    // close dropdown on Escape
                    close_dropdown(evt);
                    break;


                default:
                    return true;
            }
            evt.preventDefault();
        }
    };
    self.choices
        .toggle(open_dropdown, close_dropdown)
        .keydown(keyboard_navigation);
    self.current_path = path;
};

ContentFinder.prototype.selected_uids = function() {
    var uids = [];
    for (var i=0; i<this.selecteditems.length; i++) {
        var selected = this.selecteditems[i];
        uids.push(selected.uid);
    }
    return uids;
};

ContentFinder.prototype.listdir = function(path) {
    var self = this,
        html = [],
        selected, result, len;

    self.data = finderdata[path];
    // create the list of items to choose from
    for (var i=0; i<self.data.items.length; i++) {
        var item = self.data.items[i];
        var folderish = item.is_folderish ? ' folderish ' : ' not-folderish ';
        selected = $.inArray(item.uid, self.selected_uids()) !== -1;
        var selected_class = selected ? ' selected ' : '';
        if (item.is_folderish) {
            $.merge(html, [
                '<li class="active-result' + folderish + selected_class + '" data-url="' + item.url + '" data-uid="' + item.uid + '">',
                '<span class="contenttype-' + item.normalized_type + '">' + item.title + '</span>',
                '<a class="open-folder" data-url="' + item.url + '" data-uid="' + item.uid + '"><div class="arrow right-arrow" ></div></a>',
                '</li>'
                ]
            );
        } else {
            $.merge(html, [
                '<li class="active-result' + folderish + selected_class + '" data-url="' + item.url + '" data-uid="' + item.uid + '">',
                '<span class="contenttype-' + item.normalized_type + '">' + item.title + '</span>',
                '</li>'
                ]
            );
        }
    }
    this.results.html(html.join(''));

    /* rebuild the list of selected results
       this is necessary since selecteditems contains items selected
       across all folders
    */
    self.selectedresults = [];
    for (i=0; i<self.selecteditems.length; i++) {
        selected = self.selecteditems[i];
        result = $('li[data-uid="' + selected.uid + '"]', this.container);
        if (result.length > 0) {
            self.selectedresults.push(result);
        }
    }
    $('li.not-folderish', this.results)
        .unbind('.finderresult')
        .bind('click.finderresult', function() {
            self.result_click($(this));
        });

    $('li.folderish', this.container).single_double_click(
        function() {
            self.result_click($(this));
        },
        function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.listdir($(this).attr('data-url'));
        }
    );

    $('a.open-folder', this.container).click(
        function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.listdir($(this).attr('data-url'));
        }
    );

    $('a.open-folder .arrow', this.container).hover(
        function() {
            $(this).attr('class', 'arrow right-arrow-active');
        },
        function() {
            $(this).attr('class', 'arrow right-arrow');
        }
    );

    // breadcrumbs
    html = [];
    len = self.data.path.length;
    $.each(self.data.path, function (i, item) {
        if (i > 0) {
            html.push(" / ");
        }
        html.push(item.icon);
        if (i === len - 1) {
            html.push('<span>' + item.title + '</span>');
        } else {
            html.push('<a href="' + item.url + '">' + item.title + '</a>');
        }
    });
    $('.internalpath', this.container).html(html.join(''));

    // breadcrumb link
    $('.internalpath a', this.container)
        .unbind('.finderpath')
        .bind('click.finderpath', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.listdir($(this).attr('href'));
        });

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

ContentFinder.prototype.result_click = function(item) {
    var self = this,
        selected, i, html = [];
    if (!self.multiselect) {
        selected = self.selectedresults[0];
        if (selected !== undefined && item !== selected) {
            selected.toggleClass('selected');
            self.deselect_item(selected.attr('data-uid'));
        }
        self.selectedresults = [item];
        item.toggleClass('selected');
        self.select_item(item.attr('data-uid'));
    } else {
        // remove item from list if it was deselected
        if (item.hasClass('selected')) {
            var new_lst = [];
            for (i=0; i<self.selectedresults.length; i++) {
                selected = self.selectedresults[i];
                if (selected.attr('data-uid') === item.attr('data-uid')) {
                    selected.toggleClass('selected');
                    self.deselect_item(selected.attr('data-uid'));
                } else {
                    new_lst.push(selected);
                }
            }
            self.selectedresults = new_lst;
        } else {
            self.selectedresults.push(item);
            self.select_item(item.attr('data-uid'));
            item.toggleClass('selected');
        }
    }

    // add selections to search input
    for (i=0; i < this.selecteditems.length; i++) {
        item = this.selecteditems[i];
        html.push('<li class="search-choice" title="' + item.url + '"><span class="selected-resource">' + item.title + '</span><a href="javascript:void(0)" class="search-choice-close" rel="3" data-uid="' + item.uid + '"></a></li>');        
    }
    $('.search-choice', self.choices).remove();
    self.choices.prepend(html.join(''));
    self.input.focus();

    $('a.search-choice-close', this.chosen)
        .unbind('.selected')
        .bind('click.selected', function() {
            self.choice_destroy($(this));
        });
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
    console.log(this.pending_backstroke);
    var next_available_destroy;
    if (this.pending_backstroke) {
        this.choice_destroy(this.pending_backstroke.find("a").first());
        return this.clear_backstroke();
    } else {
        next_available_destroy = $("li.search-choice", this.choices).last();
        console.log(next_available_destroy.length);
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

// XXX This function most likely is no longer needed here as we will only use
//     the reference widget in the add component modal - but leaving it here just in case
$(document).ready(function () {
    $('.finder').each(function() {
        var url = $(this).attr('data-url');
        var finder = new ContentFinder('#'+$(this).attr('id'), url, true);
        finder.listdir(url);
    });
});

// Author:  Jacek Becela
// Source:  http://gist.github.com/399624
// License: MIT
jQuery.fn.single_double_click = function(single_click_callback, double_click_callback, timeout) {
  return this.each(function(){
    var clicks = 0, self = this;
    jQuery(this).click(function(event){
      clicks++;
      if (clicks == 1) {
        setTimeout(function(){
          if(clicks == 1) {
            single_click_callback.call(self, event);
          } else {
            double_click_callback.call(self, event);
          }
          clicks = 0;
        }, timeout || 300);
      }
    });
  });
}