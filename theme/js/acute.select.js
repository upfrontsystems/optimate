/// <reference path="../lib/angular.1.2.1.js" />

// Directive that creates a searchable dropdown list.

// Associated attributes:-
// ac-model - use instead of ng-model
// ac-options - use instead of ng-options.

// Example:- <select class="ac-select" ac-model="colour" ac-options="c.name for c in colours"></select>

// Note:- ac-options works like ng-options, but does not support option groups

angular.module("acute.select", [])
.directive("acSelect", function($parse) {
    var defaultSettings = {
        "itemHeight": 24,
        "itemsInView": 10,
        "minWidth": "100px",
        "maxWidth": "",
    };
    var NG_OPTIONS_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?(?:\s+group\s+by\s+(.*))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(.*?)(?:\s+track\s+by\s+(.*?))?$/;

    return {
        restrict: "EAC",
        scope: {
            "acSettings": "@",
            "acOptions": "@",
            "model": "=acModel",
            "acChange": "&",
            "keyField": "@acKey",
            "acFocusWhen": "=",
            "id": "@",
            "acData": "&"
        },
        replace: true,
        templateUrl: "partials/acute.select.htm",
        link: function(scope, element, attrs) {
            scope.initialise(attrs);
        },
        controller: function($scope, $element, $window, $rootScope, $timeout, $filter) {

            // watch the data and load the items
            $scope.$watch("acData()", function(items){
                if (items){
                    $scope.loadItems(items, $scope.model);
                    $scope.confirmedItem = angular.copy($scope.selectedItem);
                    $scope.allDataLoaded = true;
                }
            });

            $scope.initialise = function(attr) {
                $scope.settings = defaultSettings;
                $scope.previousSearchText = "";
                $scope.searchText = "";
                $scope.longestText = "";
                $scope.comboText = "";
                $scope.items = [];
                $scope.allItems = [];        // Unfiltered
                $scope.selectedItem = null;
                $scope.allDataLoaded = false;
                $scope.scrollTo = 0;         // To change scroll position
                $scope.scrollPosition = 0;   // Reported scroll position
                $scope.listHeight = 0;
                $scope.matchFound = false;

                processSettings();

                // Value should be in the form "label for value in array" or "for value in array"
                var words = $scope.acOptions.match(NG_OPTIONS_REGEXP);
                $scope.textField = null;
                $scope.dataFunction = null;
                $scope.modelField = null;
                // Save initial selection, if any
                $scope.setInitialSelection();

                if (words[2]) {
                    var label = words[2];     // E.g. colour.name
                    $scope.textField = label.split(".")[1];
                }
                if (words[1]){
                    var label = words[1];
                    $scope.modelField = label.split(".")[1];
                }
            };

            // Handle ac-focus-when attribute. When changed
            // give focus to the search text box
            $scope.$watch("acFocusWhen", function(focus) {
                if (focus !== undefined) {
                    // Set flag to fire the ac-focus directive
                    $scope.comboFocus = !$scope.comboFocus;
                }
            });

            $scope.setInitialSelection = function() {
                if ($scope.model) {
                    $scope.initialSelection = angular.copy($scope.model);
                    $scope.initialItem = $scope.getItemFromDataItem($scope.model, 0);
                    $scope.confirmedItem = $scope.selectedItem = $scope.initialItem;
                    $scope.comboText = $scope.confirmedItem ? $scope.confirmedItem.text : "";
                }
                else{
                    $scope.selectedItem = null;
                    $scope.confirmedItem = null;
                    $scope.modelUpdating = true;
                    $scope.initialSelection = null;
                    $scope.scrollTo = 0;
                    $scope.comboText = "";
                }
            };

            // Create dropdown items based on the source data items
            $scope.loadItems = function(dataItems, selectedDataItem) {
                var itemCount, itemIndex, item, key = $scope.keyField;

                if (angular.isArray(dataItems)) {

                    var foundSelected = false;
                    itemCount = $scope.items.length;

                    angular.forEach(dataItems, function(dataItem, index) {
                        itemIndex = itemCount + index;
                        item = $scope.getItemFromDataItem(dataItem, itemIndex);
                        if (item) {
                            $scope.items.push(item);
                            // If not currently filtering
                            if (!$scope.searchText) {
                                // Look for a matching item
                                if (dataItem === selectedDataItem || (key && selectedDataItem && dataItem[key] == selectedDataItem[key])) {
                                    confirmSelection(item);
                                    foundSelected = true;
                                }
                            }
                            else if ($scope.searchText.toLowerCase() === item.text.toLowerCase()) {
                                // Search text matches item
                                $scope.selectedItem = item;
                            }

                            if (item.text.length > $scope.longestText.length) {
                                if ($scope.maxCharacters && item.text.length > $scope.maxCharacters) {
                                    $scope.longestText = item.text.substr(0, $scope.maxCharacters);
                                }
                                else {
                                    $scope.longestText = item.text;
                                }
                            }
                        }
                    });

                    // If not currently filtering and there's no selected item, but we have an initial selection
                    if (!$scope.searchText && $scope.initialSelection && !foundSelected) {
                        // Create a new item
                        item = $scope.getItemFromDataItem($scope.initialSelection, 0);
                        if (item) {
                            // Add it to the start of the items array
                            $scope.items.unshift(item);
                            // Update indexes
                            angular.forEach($scope.items, function(item, index) {
                                item.index = index;
                            });

                            confirmSelection(item);
                        }
                    }
                    // If data is not filtered
                    if (!$scope.searchText) {
                        if ($scope.items !== $scope.allItems){
                            angular.copy($scope.items, $scope.allItems);
                        }
                    }

                    $scope.setListHeight();
                    checkItemCount($scope.items);
                }
            };

            function processSettings() {
                if ($scope.acSettings) {
                    var settings = $scope.$eval($scope.acSettings);
                    if (typeof settings === "object") {
                        // Merge settings with default values
                        angular.extend($scope.settings, settings);
                    }
                }
                $scope.longestText = "";

                $scope.maxTextWidth = "";

                // If maxWidth is set, limit textbox size, allowing room for dropdown icon
                if ($scope.settings.maxWidth) {
                    var maxWidth = parseInt($scope.settings.maxWidth);
                    // Set an approximate limit to the number of characters to allow in $scope.longestText
                    $scope.maxCharacters = Math.round(maxWidth / 6);
                    $scope.maxTextWidth = (maxWidth - 100) + "px";
                }
            }

            function checkItemCount() {
                $scope.noItemsFound = $scope.items.length === 0;
                //GC: If no item is found clear the selected item
                if ($scope.noItemsFound) {
                    $scope.selectedItem = null;
                }
            }

            $scope.getItemFromDataItem = function(dataItem, itemIndex) {
                var item = null;
                if (dataItem !== null) {
                    if ($scope.textField === null && typeof dataItem === 'string') {
                        item = { "text": dataItem, "value": dataItem, "index": itemIndex };
                    }
                    else if (dataItem[$scope.textField]) {
                        item = { "text": dataItem[$scope.textField], "value": dataItem, "index": itemIndex };
                    }
                    else if ($scope.modelField){
                        item = { "text": "", "value": dataItem, "index": itemIndex };
                    }
                }
                return item;
            };

            // Set height of list according to number of visible items
            $scope.setListHeight = function() {
                var itemCount = $scope.items.length;
                if (itemCount > $scope.settings.itemsInView) {
                    itemCount = $scope.settings.itemsInView;
                }

                $scope.listHeight = $scope.settings.itemHeight * itemCount;
            };

            $scope.$watch("model", function(newValue, oldValue) {
                if (newValue != oldValue) {
                    if ($scope.modelUpdating) {
                        $scope.modelUpdating = false;
                    }
                    else if (!newValue && !oldValue) {
                        // Do nothing
                    }
                    else if (newValue && !oldValue) {
                        // Model no longer null
                        $scope.setInitialSelection();
                    }
                    else if (oldValue && !newValue) {
                        // Model cleared
                        $scope.setInitialSelection();
                    }
                    else {
                        // Check that the text is different
                        if (!$scope.textField || newValue[$scope.textField] !== oldValue[$scope.textField]) {
                            // Model has been changed in the parent scope
                            $scope.setInitialSelection();
                        }
                    }
                }
            });

            if ($scope.selectedItem) {
                $scope.comboText = $scope.selectedItem.text;
            }

            // Callback function to receive async data
            $scope.dataCallback = function(data, searchText, offset) {

                // Quit if search text has changed since the data function was called
                if (searchText !== undefined && searchText !== $scope.searchText) {
                    return;
                }

                var selectedDataItem = null;

                $scope.dataItems = data;

                // If we have a selected item, get its value
                if ($scope.selectedItem !== null) {
                    selectedDataItem = $scope.selectedItem.value;
                }
                else {
                    selectedDataItem = $scope.model;
                }

                // Clear all existing items, unless offset > 0, i.e. we're paging and getting additional items
                if (!offset || offset == 0) {
                    $scope.items = [];
                }
                $scope.loadItems(data, selectedDataItem);

                // All data is now loaded
                $scope.allDataLoaded = true;

                $scope.previousSearchText = $scope.searchText;
            };

            $scope.comboTextChange = function() {
                $scope.searchText = $scope.comboText;
                console.log($scope.comboText);
                if ($scope.comboText == '') {
                    $scope.clearSelection();
                }

                $scope.filterData();
            };

            $scope.itemClick = function(i) {
                confirmSelection($scope.items[i]);
            };

            $scope.getItemClass = function(i) {
                if ($scope.selectedItem && $scope.items[i].value === $scope.selectedItem.value) {
                    return "ac-select-highlight";
                }
                else {
                    return "";
                }
            };

            $scope.listScrolled = function(scrollPosition) {
                $scope.scrollPosition = scrollPosition;
            };

            // Private functions

            function confirmSelection(item) {
                $scope.selectedItem = item;

                var oldConfirmedItem = $scope.confirmedItem;
                if ($scope.selectedItem) {
                    $scope.confirmedItem = angular.copy($scope.selectedItem);
                    $scope.modelUpdating = true;
                    if ($scope.modelField){
                        $scope.model = $scope.selectedItem.value[$scope.modelField];
                    }
                    else{
                        $scope.model = $scope.selectedItem.value;
                    }
                    $scope.comboText = $scope.selectedItem.text;
                }

                fireChangeEvent();

                // Clear any initial selection
                $scope.initialSelection = null;
                $scope.initialItem == null;
            }

            function fireChangeEvent() {
                // Fire acChange function, if specified
                if (typeof $scope.acChange === 'function') {
                    $timeout(function() {
                        $scope.acChange({ value: $scope.selectedItem ? $scope.selectedItem.value : null });
                    });
                }
            }

            $scope.clearSelection = function() {
                var oldConfirmedItem = $scope.confirmedItem;
                $scope.selectedItem = null;
                $scope.confirmedItem = null;
                $scope.modelUpdating = true;
                $scope.model = null;
                $scope.initialSelection = null;
                $scope.scrollTo = 0;
                $scope.comboText = "";

                if (oldConfirmedItem !== null) {
                    fireChangeEvent();
                }
            }

            function ensureItemVisible(item) {
                var itemHeight = $scope.settings.itemHeight;
                var itemTop = itemHeight * item.index;
                if (itemTop + itemHeight > $scope.listHeight + $scope.scrollPosition) {
                    $scope.scrollTo = itemTop + itemHeight - $scope.listHeight;
                }
                else if (itemTop < $scope.scrollPosition) {
                    $scope.scrollTo = itemTop;
                }
            }

            $scope.filterData = function() {

                var itemCount = $scope.allItems.length;

                if ($scope.allDataLoaded) {

                    var itemsToFilter = $scope.allItems;

                    // If search text includes the previous search
                    if ($scope.previousSearchText && $scope.searchText.indexOf($scope.previousSearchText) != -1) {
                        // We can refine the filtering, without checking all items
                        itemsToFilter = $scope.items;
                    }

                    $scope.items = $filter("filter")(itemsToFilter, function(item) {
                        // Check for match at start of items only
                        return item.text.toLowerCase().indexOf($scope.searchText.toLowerCase()) > -1;
                    });
                    // Update indexes
                    angular.forEach($scope.items, function(item, index) {
                        item.index = index;
                    });

                    checkItemCount();
                }

                // If narrowed down to one item (and search text isn't a subset of the previous search), select it
                if ($scope.items.length === 1 && $scope.previousSearchText.indexOf($scope.searchText) === -1) {
                    $scope.matchFound = true;
                    $scope.selectedItem = $scope.items[0];
                }
                else {
                    // See if the search text exactly matches one of the items
                    $scope.matchFound = searchTextMatchesItem();
                }

                $scope.previousSearchText = $scope.searchText;
                $scope.setListHeight();
            };

            // Look for an item with text that exactly matches the search text
            function searchTextMatchesItem() {
                var i, valid = false;
                if ($scope.searchText.length > 0) {
                    for (i = 0; i < $scope.items.length; i++) {
                        if ($scope.searchText.toLowerCase() === $scope.items[i].text.toLowerCase()) {
                            $scope.selectedItem = $scope.items[i];
                            $scope.searchText = $scope.comboText = $scope.selectedItem.text;
                            valid = true;
                            break;
                        }
                    }
                }
                return valid;
            }
        }
    };
})

// Directive to set focus to an element when a specified expression is true
.directive('acFocus', function($timeout, $parse, safeApply) {
    return {
        restrict: "A",
        link: function(scope, element, attributes) {
            var setFocus = $parse(attributes.acFocus);
            scope.$watch(setFocus, function(focus) {
                if (focus !== undefined) {
                    $timeout(function() {
                        element[0].focus();
                    }, 100);
                }
            });
            // Set the "setFocus" attribute value to 'false' on blur event
            // using the "assign" method on the function that $parse returns
            element.bind('blur', function() {
                safeApply(scope, function() { setFocus.assign(scope, false) });
            });
        }
    };
})

.directive('acSelectOnFocus', function() {
    return {
        restrict: 'A',
        scope: {
            acSelectOnFocus: "="
        },
        link: function(scope, element, attrs) {
            element.bind('focus', function() {
                if (scope.acSelectOnFocus !== false && scope.acSelectOnFocus !== 'false') {
                    element[0].select();
                }
            });
        }
    };
})

// Directive for a scroll container. Set the "ac-scroll-to" attribute to an expression and when its value changes,
// the div will scroll to that position
.directive('acScrollTo', function() {
    return {
        restrict: "A",
        scope: false,
        controller: function($scope, $element, $attrs) {
            var expression = $attrs.acScrollTo;
            $scope.$watch(expression, function(newValue, oldValue) {
                if (newValue != oldValue) {
                    var scrollTop = $scope.$eval(expression);
                    angular.element($element)[0].scrollTop = scrollTop;
                }
            });
        }
    };
})

// Call a function when the element is scrolled
// E.g. ac-on-scroll="listScrolled()"
// N.B. take care not to use the result to directly update an acScrollTo expression
// as this will result in an infinite recursion!
.directive('acOnScroll', function() {
    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            var callbackName = attrs.acOnScroll;
            if (callbackName.indexOf("()") === callbackName.length - 2) {
                callbackName = callbackName.substr(0, callbackName.length - 2);
            }
            var callback = scope[callbackName];
            if (typeof callback === "function") {
                element.bind("scroll", function() {
                    callback(element[0].scrollTop);
                });
            }
        }
    };
})

// safeApply service, courtesy Alex Vanston and Andrew Reutter
.factory('safeApply', [function($rootScope) {
    return function($scope, fn) {
        var phase = $scope.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn) {
                $scope.$eval(fn);
            }
        } else {
            if (fn) {
                $scope.$apply(fn);
            } else {
                $scope.$apply();
            }
        }
    }
}])
