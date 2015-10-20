function toggleMenu(itemclass) {
    $("ul.nav li").removeClass("active");
    $("li."+itemclass).toggleClass("active");
}

var duplicateModalController = function ($scope, $modalInstance, selections) {

    $scope.selections = selections;

    $scope.skip = function () {
        $scope.selections.overwrite = false;
        $modalInstance.close($scope.selections);
    };

    $scope.overwrite = function () {
        $scope.selections.overwrite = true;
        $modalInstance.close($scope.selections);
    };
};

angular.module('myApp').controller('duplicateModalController', duplicateModalController);

var checkRateAndQuantityController = function ($scope, $modalInstance, selections) {
    $scope.selections = selections;
    $scope.modaltitle = selections.length > 1 ? "Paste rate and/or quantity" :
                                                "Paste quantity";
    $scope.done = function () {
        $modalInstance.close($scope.selections);
    };
};

angular.module('myApp').controller('checkRateAndQuantityController', checkRateAndQuantityController);

// Controller for the projects and treeview
myApp.controller('projectsController',['$scope', '$http', '$cacheFactory', 'globalServerURL', '$timeout', '$modal', 'SessionService', '$q', 'FileSaver', 'hotkeys',
    function($scope, $http, $cacheFactory, globalServerURL, $timeout, $modal, SessionService, $q, FileSaver, hotkeys) {

        toggleMenu('projects');
        // variable for disabling submit button after user clicked it
        $scope.isDisabled = false;
        $scope.calculatorHidden = true; // set calculator to be hidden by default
        $scope.rowsSelected = false;    // set selected rows false
        $scope.showBudgetActions = false;
        $scope.projectStates = ['Draft', 'Approved', 'Completed'];
        $scope.selectedReportType = "something";

        // bind the hotkeys
        hotkeys.bindTo($scope)
        .add({
            combo: 'ctrl+c',
            description: 'Copy',
            callback: function() {
                if ($scope.user.permissions.projects == 'edit'){
                    if ($scope.rowsSelected){
                        // call the copy rows function
                        $scope.copySelectedRecords($scope.currentNode);
                    }
                    else if ($scope.currentNode){
                        // call the copy node function
                        $scope.copyThisNode($scope.currentNode);
                    }
                }
            }
        })
        .add({
            combo: 'ctrl+x',
            description: 'Cut',
            callback: function() {
                if ($scope.user.permissions.projects == 'edit' && $scope.currentNode){
                    if ($scope.currentNode.Status != 'Approved'){
                        if ($scope.currentNode.ParentType != 'BudgetItem'){
                            if ($scope.rowsSelected){
                                // call the cut rows function
                                $scope.cutSelectedRecords($scope.currentNode);
                            }
                            else {
                                // call the cut node function
                                $scope.cutThisNode($scope.currentNode);
                            }
                        }
                    }
                }
            }
        })
        .add({
            combo: 'ctrl+v',
            description: 'Paste',
            callback: function() {
                if ($scope.user.permissions.projects == 'edit' && $scope.currentNode && $scope.copiedNode){
                    if ($scope.copiedNode.NodeType == 'Project'){
                        $scope.pasteThisNode($scope.projectsRoot);
                    }
                    else if ($scope.currentNode.ParentType != 'BudgetItem'){
                        var nonPastingTypes = ["Resource", "ResourcePart", "ResourceUnit", "SimpleBudgetItem"];
                        if (nonPastingTypes.indexOf($scope.currentNode.NodeType) == -1){
                            if ($scope.copiedNode.NodeType == 'Records'){
                                // paste records
                                $scope.pasteSelectedRecords($scope.currentNode);
                            }
                            else{
                                // check compatible types
                                var testTypes = $scope.currentNode.NodeType + ':' + $scope.copiedNode.NodeType;
                                switch (testTypes){
                                    case 'Project:BudgetGroup':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'BudgetGroup:BudgetGroup':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'BudgetGroup:BudgetItem':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'BudgetGroup:SimpleBudgetItem':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'ResourceCategory:ResourceCategory':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'ResourceCategory:Resource':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                    case 'ResourceCategory:ResourceUnit':
                                        $scope.pasteThisNode($scope.currentNode);
                                        break;
                                }
                            }
                        }
                    }
                }
            }
        })
        .add({
            combo: 'del',
            description: 'Delete',
            callback: function() {
                if ($scope.user.permissions.projects == 'edit' && $scope.currentNode){
                    if ($scope.currentNode.Status != 'Approved' && $scope.currentNode.ParentType != 'BudgetItem'){
                        $scope.deleteConfirmation();
                    }
                }
            }
        });


        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });
        // get the currency
        SessionService.get_currency().then(function(c){
            $scope.currency = c;
        })

        // aux function to test if we can support localstorage
        var hasStorage = (function() {
            try {
                var mod = 'modernizr';
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                return true;
            }
            catch (exception) {
                return false;
            }
        }());
        // reopen projects that were previously opened upon page load
        $scope.preloadProjects = function () {
            var deferred = $q.defer();
            if (hasStorage) {
                open_projects = []
                try {
                    open_projects = JSON.parse(localStorage["open_projects"])
                }
                catch (exception) {
                }
                if ( open_projects.length != 0 ) {
                    for (var i = 0; i < open_projects.length; i++) {
                        var id = open_projects[i];
                        var url = globalServerURL + 'node/' + id + '/'
                        $http.get(url).success(function(data) {
                            if (data.NodeType != 'Project'){
                                $scope.closeProject(id);
                            }
                            else{
                                $scope.projectsRoot.Subitem.push(data);
                                $scope.projectsRoot.Subitem.sort(function(a, b) {
                                    return a.Name.localeCompare(b.Name)
                                });
                            }
                        }).finally(function(){
                            deferred.resolve();
                        });
                    }
                }
                else{
                    deferred.resolve();
                }
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!");
                deferred.resolve();
            }
            return deferred.promise;
        };

        // build the root for the projects in the tree
        $scope.projectsRoot = {"Name": "Root", "ID": 0, "NodeType":"Root", "Subitem": []};
        // check if anything is stored in local storage
        $scope.preloadProjects().finally(function(){
            $scope.loadLists()
        });

        $scope.loadLists = function(){
            // load the projects used in the select project modal
            $http.get(globalServerURL + 'projects/').success(function(data) {
                $scope.projectsList = data;
            });

            // load the unit list
            $http.get(globalServerURL + 'units').success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });

            // load the resource types
            $http.get(globalServerURL + 'resourcetypes').success(function(data) {
                $scope.restypeList = data;
                console.log("Resource Type list loaded");
            });

            // load the suppliers list
            $http.get(globalServerURL + 'suppliers').success(function(data) {
                $scope.supplierList = data;
                console.log("Resource Supplier list loaded");
            });

            // load the city list
            $http.get(globalServerURL + 'cities').success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });

            // load the client list
            $http.get(globalServerURL + 'clients').success(function(data) {
                $scope.clientList = data;
                console.log("Client list loaded");
            });
        };

        $scope.statusMessage = function(message, timeout, type) {
            $('#status_message span').text(message);
            $('#status_message span').addClass(type);
            $('#status_message').show();
            // setting timeout to 0, makes the message sticky, next non-sticky
            // message will clear it.
            if ( timeout != 0 ) {
                window.setTimeout(function () {
                    $("#status_message").hide();
                    $('#status_message span').removeClass(type);
                }, timeout);
            }
        }

        // When a new project is added to the tree
        $scope.projectAdded = function(newproject) {
            if (!(containsObject(newproject, $scope.projectsRoot.Subitem))) {
                // add the new project to the projects and role list and sort
                $scope.projectsList.push(newproject);
                $scope.projectsList.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });

                $scope.projectsRoot.Subitem.push(newproject);
                $scope.projectsRoot.Subitem.sort(function(a, b) {
                    var textA = a.Name.toUpperCase();
                    var textB = b.Name.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                });
                if (hasStorage) {
                    // add id of project to local storage
                    var open_projects;
                    try {
                        // attempt to add an id to open_projects storage
                        open_projects = JSON.parse(localStorage["open_projects"])
                        open_projects.push(newproject.ID);
                        localStorage["open_projects"] = JSON.stringify(open_projects);
                    }
                    catch (exception) {
                        // create a new open_projects storage as one doesnt exist
                        localStorage.setItem("open_projects", []);
                        open_projects = []
                        open_projects.push(newproject.ID);
                        localStorage["open_projects"] = JSON.stringify(open_projects);
                    }
                }
                else {
                    console.log("LOCAL STORAGE NOT SUPPORTED!")
                }
                console.log("Project added");
            }
        };

        // aux function - checks if object is already in list based on ID
        function containsObject(obj, list) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].ID === obj.ID) {
                    return true;
                }
            }
            return false;
        }

        // load the project that has been selected into the tree
        $scope.loadProject = function () {
            var id = $scope.selectedProject;
            var url = globalServerURL + 'node/' + id + '/'
            $http.get(url).success(function(data) {
                if (!(containsObject(data, $scope.projectsRoot.Subitem))) {
                    // add latest select project, if not already in the list
                    $scope.projectsRoot.Subitem.push(data);
                    // sort alphabetically by project name
                    $scope.projectsRoot.Subitem.sort(function(a, b) {
                        var textA = a.Name.toUpperCase();
                        var textB = b.Name.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });
                    if (hasStorage) {
                        // add id of project to local storage
                        var open_projects;
                        try {
                            // attempt to add an id to open_projects storage
                            open_projects = JSON.parse(localStorage["open_projects"])
                            open_projects.push(data.ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                        catch (exception) {
                            // create a new open_projects storage as one doesnt exist
                            localStorage.setItem("open_projects", []);
                            open_projects = []
                            open_projects.push(data.ID);
                            localStorage["open_projects"] = JSON.stringify(open_projects);
                        }
                    }
                    else {
                        console.log("LOCAL STORAGE NOT SUPPORTED!")
                    }
                }
            });
        };

        // Close a project and remove it from the tree
        $scope.closeProject = function (project_id) {
            // clear the slickgrid
            $scope.handleClearSlickgrid();
            var result = $.grep($scope.projectsRoot.Subitem, function(e) {
                return e.ID == project_id;
            });
            var i = $scope.projectsRoot.Subitem.indexOf(result[0]);
            if (i != -1) {
                $scope.projectsRoot.Subitem.splice(i, 1);
            }

            if (hasStorage) {
                // remove id of project that we are closing from storage
                var open_projects = JSON.parse(localStorage["open_projects"])
                var index = open_projects.indexOf(project_id);
                if (index > -1) {
                    open_projects.splice(index, 1);
                }
                localStorage["open_projects"] = JSON.stringify(open_projects);
            }
            else {
                console.log("LOCAL STORAGE NOT SUPPORTED!")
            }
        };

        // functions used by the treeview
        // --------------------------------------------------------------------
        $scope.overheadList = [];
        // set the collapsed flag to false, this allows horizontal dragging
        // into any node
        $scope.$broadcast('expandAll');

        // set the allowed types to be dropped
        $scope.allowed = {};
        $scope.allowed['Project'] = ['BudgetGroup'];
        $scope.allowed['BudgetGroup'] = ['BudgetGroup', 'BudgetItem', 'SimpleBudgetItem'];
        $scope.allowed['BudgetItem'] = ['BudgetItem'];
        $scope.allowed['ResourceCategory'] = ['ResourceCategory', 'Resource'];
        $scope.allowed['Resource'] = [];
        $scope.allowed['ResourceUnit'] = [];
        $scope.allowed['ResourcePart'] = [];
        $scope.allowed['SimpleBudgetItem'] =[];
        $scope.allowed['Root'] = ['Project'];
        $scope.dragOverNode = {'original': undefined};
        $scope.dragOver = function(node) {
            // check for the previous dragged over node
            if ($scope.dragOverNode.copy != undefined) {
                // reset previous to default values
                $scope.dragOverNode.copy.selected = undefined;
                var original = $scope.dragOverNode.original || {'Subitem': undefined};
                if (original.Subitem != undefined) {
                    $scope.dragOverNode.copy.Subitem = original.Subitem;
                    // $scope.dragOverNode.copy.expanded = $scope.dragOverNode.original.expanded;
                }
            }
            // reset original node values
            $scope.dragOverNode.original = {'Subitem': undefined};
            $scope.dragOverNode.copy = node;
            // highlight the parent destination node
            $scope.dragOverNode.copy.selected = 'selected';
            // if the current node has no children add a dummy child
            if ($scope.dragOverNode.copy.Subitem.length == 0) {
                $scope.dragOverNode.original.Subitem = [];
                // $scope.dragOverNode.original.expanded = false;
                $scope.dragOverNode.copy.Subitem.push({'Name': '', 'NodeType': 'Default'});
                // $scope.dragOverNode.copy.expanded = true;
            }
            // if the node is collapsed clear the children name
            // else if (!$scope.dragOverNode.copy.expanded) {
            //     $scope.dragOverNode.original.Subitem = [{'Name': '...', 'NodeType': 'Default'}];
            //     // $scope.dragOverNode.original.expanded = false;
            //     $scope.dragOverNode.copy.Subitem[0].Name = '';
            //     // $scope.dragOverNode.copy.expanded = true;
            // }
        }

        // define the tree options for the ui-tree
        $scope.treeOptions = {
            // check if the dropped node can be accepted in the tree
           accept: function(sourceNodeScope, destNodesScope, destIndex) {
                var srctype = sourceNodeScope.$element.attr('data-type');
                var dsttype = destNodesScope.$element.attr('data-type') || 'Root';
                // $scope.treeOptions.draggedOver = destNodesScope.$nodeScope.$modelValue;

                // check the allowed array for the types
                if ($scope.allowed[dsttype]) {
                    if ($scope.allowed[dsttype].indexOf(srctype) > -1) {
                        // call the drag over function
                        if (destNodesScope.$nodeScope) {
                            $scope.dragOver(destNodesScope.$nodeScope.$modelValue);
                        }
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    return false;
                }
            },

            // when a node is dropped get the id's and paste in the server
            dropped: function(event) {
                // get the node ids from the model value
                if (event.dest.nodesScope.$nodeScope) {
                    var dest = event.dest.nodesScope.$nodeScope.$modelValue;
                }
                else {
                     var dest = {"ID":0}
                }
                if (event.source.nodesScope.$nodeScope)
                    var srcparent = event.source.nodesScope.$nodeScope.$modelValue.ID;
                else {
                    var srcparent = 0;
                }
                // only paste if it is not the same parent
                if (dest.ID != srcparent) {
                    var parent = event.dest.nodesScope.$nodeScope || null;
                    var destprojectid = undefined;
                    // find the project the destination node is in
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            destprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // find the project the source node is in
                    var parent = event.source.nodesScope.$nodeScope || null;
                    var srcprojectid = undefined;
                    while (parent != null) {
                        if (parent.$parentNodeScope == null) {
                            srcprojectid = parent.$modelValue.ID;
                        }
                        parent = parent.$parentNodeScope;
                    }
                    // set the current node to the one dropped in
                    $scope.currentNode = dest;
                    var src = event.source.nodeScope.$modelValue;
                    // add a flag to the destination parent
                    event.source.nodeScope.$modelValue.destParent = dest.ID;
                    // if it's in the same project, cut
                    if (destprojectid == srcprojectid) {
                        $scope.currentNodeScope = event.source.nodeScope;
                        $scope.cutThisNode(src);
                        $scope.currentNode = dest;
                        $scope.pasteThisNode(dest);
                        // set the flag to indicate that this pasting operation
                        // originated from a drag operation
                        $scope.pastingFromDnd = true;
                    }
                    // otherwise paste
                    else {
                        $scope.copyThisNode(src);
                        $scope.pasteThisNode(dest);
                        // set the flag to indicate the source needs to be added
                        // back to the parent when the node drops
                        $scope.addNodeBack = true;
                        // set the flag to indicate that this pasting operation
                        // originated from a drag operation
                        $scope.pastingFromDnd = true;
                    }
                }
                // clear the drag over value
                if ($scope.dragOverNode != undefined) {
                    if ($scope.dragOverNode.copy != undefined) {
                        $scope.dragOverNode.copy.selected = undefined;
                    }
                }
                $scope.dragOverNode = {'original': undefined};
            },

            dragStart: function(event){
                // collapse the node on drag start
                event.source.nodeScope.$modelValue.expanded = false;
                event.source.nodeScope.$modelValue.selected = undefined;
                if ($scope.currentNode){
                    $scope.currentNode.selected = undefined;
                }
            },

            dragStop: function(event) {
                if ($scope.addNodeBack) {
                    var sourceobject = event.source.nodeScope.$modelValue;
                    var parent = event.source.nodeScope.$parentNodeScope.$modelValue;
                    var start = 0;
                    // start sorting from index 1 if parent is project
                    if (parent.NodeType == 'Project') {
                        start = 1;
                    }
                    // get the index to insert the node
                    var index = $scope.locationOf(sourceobject, parent.Subitem, start);
                    parent.Subitem.splice(index, 0, sourceobject)
                    $scope.addNodeBack = false;
                }
                if ($scope.currentNode){
                    $scope.currentNode.selected = 'selected';
                }
            },
        };

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.expanded) {
                selectedNode.expanded = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + 'node/' + parentid + '/children/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.expanded = false;
            }
        };

        // if node label clicks,
        $scope.selectNodeLabel = function(scope) {
            // reload the slickgrid
            $scope.handleReloadSlickgrid(scope.$modelValue.ID);
            // set the current scope
            $scope.currentNodeScope = scope;
            // remove highlight from previous node
            if ($scope.currentNode) {
                $scope.currentNode.selected = undefined;
            }
            // set highlight to selected node
            // set currentNode
            $scope.currentNode = scope.$modelValue;
            $scope.currentNode.selected = 'selected';
        };

        $scope.loadOverheads = function(projectid) {
            var req = {
                method: 'GET',
                url: globalServerURL + projectid + '/overheads/',
                params: {}
            }
            $http(req)
            .success(function(data) {
                $scope.overheadList = data;
                console.log("Overhead list loaded");
            });
            $scope.newOverhead = {'Type': 'BudgetItem'};
        };

        // load the overheads a budgetitem can use
        $scope.loadBudgetItemOverheads = function(nodeid) {
            deferred = $q.defer()
            var req = {
                method: 'GET',
                url: globalServerURL + nodeid + '/overheads/',
                params: {'NodeType':'BudgetItem'}
            }
            $http(req)
            .success(function(data) {
                $scope.budgetItemOverheadList = data;
                console.log("BudgetItem overhead list loaded");
                deferred.resolve();
            });
            return deferred.promise;
        }

        // load the markups that apply to the selection
        $scope.loadSelectionMarkup = function(){
            // get the id of a selected row and load the budgetitem markups
            $scope.loadBudgetItemOverheads($scope.getSelectedNodes()[0].ID);
        }

        // delete an overhead by id
        $scope.deleteOverhead = function(overhead) {
            if (overhead.ID){
                var req = {
                    method: 'DELETE',
                    url: globalServerURL + 'overhead/' + overhead.ID + '/'
                }
                $http(req).success(function() {
                    console.log("Overhead deleted");
                });
            }
            else{
                console.log("Overhead removed");
            }
            var index = $scope.overheadList.indexOf(overhead);
            $scope.overheadList.splice(index, 1);
        }

        // add an overhead with the project id
        $scope.addOverhead = function() {
            if ($scope.newOverhead.Name) {
                $scope.overheadList.push({'Name': $scope.newOverhead.Name,
                                        'Percentage': $scope.newOverhead.Percentage,
                                        'Type': $scope.newOverhead.Type})
                $scope.newOverhead = {'Type': 'BudgetItem'};
            }
        }

        // post the edited overheadlist to the server
        $scope.updateOverheads = function(projectid) {
            if ($scope.newOverhead.Name) {
                $scope.addOverhead();
            }
            var req = {
                method: 'POST',
                url: globalServerURL + projectid + '/overheads/',
                data: {'overheadlist':$scope.overheadList}
            }
            $http(req).success(function() {
                console.log("Overheads updated");
            });
            $scope.newOverhead = {'Type': 'BudgetItem'};
        }

        // transform the tag to a new resource-like object
        $scope.tagTransform = function (newTag) {
            var item = {
                Name: newTag,
                ID: undefined,
                Description: "",
                Rate: "0.00",
                Quantity: "0",
                Type: undefined
            };
            return item;
        };

        // search for the resources in the node's category that match the search term
        $scope.refreshResources = function(searchterm) {
            if ($scope.currentNode && searchterm) {
                var req = {
                    method: 'GET',
                    url: globalServerURL + 'project/' + $scope.currentNode.ID + '/resources/',
                    params: {'search': searchterm}
                };
                $http(req).success(function(response) {
                    // if nothing has been found, add a non-selectable option
                    if (response.length == 0){
                        response.push({'Name': 'No match found',
                                        'nothingFound': true})
                    }
                    $scope.resourceList = response;
                });
            }
        }

        $scope.resourceSelected = function(item, nodetype) {
            if (nodetype != 'ResourcePart'){
                var $addBudgetItem = $('#addBudgetItem');
                if (item.ID == undefined) {
                    $scope.addBudgetItemForm.has_selection = false;
                    $scope.formData.NodeType = 'SimpleBudgetItem';
                    $scope.formData.Name = item.Name;
                    $scope.formData.ResourceName = item.Name;
                    $addBudgetItem.find('#description').focus();
                }
                else {
                    $scope.addBudgetItemForm.has_selection = true;
                    $scope.formData.Description = item.Description;
                    $scope.formData.Rate = item.Rate;
                    $scope.formData.ResourceTypeID = item.ResourceTypeID;
                    $scope.formData.NodeType = 'BudgetItem';
                    $scope.formData.Name = item.Name;
                    $addBudgetItem.find('#inputQuantity').focus();
                }
            }
        };

        // load the lists used in adding/editing a budgetitem
        $scope.loadBudgetItemRelatedList = function(nodeid) {
            $scope.loadBudgetItemOverheads(nodeid);
        };

        // When the addNode button is clicked on the modal a new node
        // is added to the database
        $scope.addNode = function () {
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                var currentid = $scope.currentNode.ID;
                // if the node is a budgetitem set the selected data to the form
                if ($scope.formData.NodeType == 'BudgetItem' || $scope.formData.NodeType == 'SimpleBudgetItem') {
                    if ($scope.formData.selected.ID === undefined) {
                        $scope.formData.NodeType = 'SimpleBudgetItem';
                    }
                    else {
                        $scope.formData.ResourceID = $scope.formData.selected.ID;
                        $scope.formData['OverheadList'] = $scope.budgetItemOverheadList || [];
                        $scope.formData.NodeType = 'BudgetItem';
                    }
                }
                else if ($scope.formData.NodeType == 'ResourcePart') {
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.selected = {};
                }
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + currentid + '/',
                    data: $scope.formData
                }).success(function(response) {
                    $scope.formData = {'NodeType':$scope.formData.NodeType};
                    // if the node parent is the current node
                    var node = response.node;
                    if (node.ParentID === $scope.currentNode.ID) {
                        $scope.handleNew(node);
                    }
                    console.log("Node added");
                });
            }
        };

        $scope.handleNew= function(node) {
            $scope.handleReloadSlickgrid(node.ParentID)
            // expand the node if this is its first child
            if ($scope.currentNode.Subitem.length == 0) {
                $scope.currentNode.expanded = true;
            }
            // insert the newly created node in the correct place
            var start = 0;
            if ($scope.currentNode.NodeType == 'Project') {
                start = 1;
            }
            var index = $scope.locationOf(node, $scope.currentNode.Subitem, start);
            $scope.currentNode.Subitem.splice(index, 0, node)
        };

        // Add a project to the tree and reload the projectlist
        $scope.addProject = function() {
            // check if adding is disabled, if not disable it and add the node
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                $http({
                    method: 'POST',
                    url: globalServerURL + 'node/' + '0' + '/',
                    data: $scope.formData
                }).success(function (response) {
                    $scope.formData['ID'] = response['ID'];
                    $scope.formData['NodeTypeAbbr'] = 'P';
                    $scope.formData['Subitem'] = [{'Name': '...'}];
                    $scope.projectAdded($scope.formData);
                    $scope.formData = {'NodeType':$scope.formData['NodeType']};
                });
            }
        };

        $scope.locationOf = function(element, array, start, end) {
            // return the location the object should be inserted in a sorted array
            if ($scope.currentNode.Subitem.length === 0) {
                return 0;
            }

            start = start || 0;
            end = end || array.length;
            var pivot = (start + end) >> 1;
            var c = $scope.nodeCompare(element, array[pivot]);
            if (end - start <= 1) {
                return c == -1 ? pivot: pivot + 1;

            }

            switch (c) {
                case -1: return $scope.locationOf(element, array, start, pivot);
                case 0: return pivot;
                case 1: return $scope.locationOf(element, array, pivot, end);
            };
        };

        $scope.nodeCompare = function (a, b) {
            if (b) {
                if (a.Name.toUpperCase() < b.Name.toUpperCase()) return -1;
                if (a.Name.toUpperCase() > b.Name.toUpperCase()) return 1;
                return 0;
            }
            else {
                return -1;
            }
        };

        // Setting the type of the node to be added
        // refresh it if the type is the same
        // $timeout is used so that the scope is refreshed and the directive
        // reloaded even if the node type is the same
        // reset the formdata to the type
        $scope.changeAddingType = function(nodetype) {
            $scope.calculatorHidden = true;
            if ($scope.addingNodeType == nodetype) {
                $scope.addingNodeType = '';
                $timeout(function() {
                    $scope.changeAddingType(nodetype);
                });
            }
            else {
                $scope.addingNodeType = nodetype;
            }
            $scope.isDisabled = false;
            $scope.modalState = "Add";
            $scope.resourceList = [];
            $scope.formData = {'NodeType': nodetype};
            $scope.addBudgetItemForm.has_selection = false;
            $scope['add' + nodetype + 'Form'].$setPristine();
        }

        // edit the current node
        $scope.editNode = function() {
            $scope.calculatorHidden = true;
            $scope.modalState = "Edit"
            $scope.isDisabled = false;
            $http.get(globalServerURL + 'node/' + $scope.currentNode.ID + '/')
            .success(function(response) {
                var nodetype = response.NodeType;
                $scope.formData = response;
                $scope.formData.selected = {};
                // special case for budgetitem types
                if (nodetype == 'BudgetItem') {
                    // populate the selection
                    $scope.refreshResources(response.Name);
                    $scope.formData.selected.ID = response.ResourceID;
                    $scope.formData.selected.Name = response.Name;
                    $scope.resourceSelected($scope.formData);
                    // load budgetitem overhead list
                    $scope.loadBudgetItemOverheads(response.ID).then(function(){
                        var overheadlist = response.OverheadList;
                        for (var i = 0; i < overheadlist.length; i++) {
                            var index = $scope.budgetItemOverheadList.map(function(e) {
                                return e.ID; }).indexOf(overheadlist[i].ID);
                            if (index > -1) {
                                $scope.budgetItemOverheadList[index].selected = true;
                            }
                        }
                        $scope.formData.OverheadList = $scope.budgetItemOverheadList;
                    });
                }
                else if (nodetype == 'SimpleBudgetItem') {
                    // populate the selection
                    $scope.formData.selected.Name = response.Name;
                    $scope.resourceSelected($scope.formData.selected);
                    nodetype = 'BudgetItem';
                }
                else if (nodetype == 'ResourcePart'){
                    $scope.refreshResources(response.Name);
                    $scope.formData.selected.Quantity = response.Quantity;
                    $scope.formData.selected.ID = response.ResourceID;
                    $scope.formData.selected.Name = response.Name;
                }
                $scope.formData.originalName = $scope.currentNode.Name;
                // set each field dirty
                angular.forEach($scope['add' + nodetype + 'Form'].$error.required, function(field) {
                    field.$setDirty();
                });
            });
        };

        // save changes made to the node's properties
        $scope.saveNodeEdits = function() {
            if (!$scope.isDisabled) {
                $scope.isDisabled = true;
                // if the node is a budgetitem set the selected data to the form
                var nodetype = $scope.formData.NodeType;
                if (nodetype == 'BudgetItem' || nodetype == 'SimpleBudgetItem') {
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.Name = $scope.formData.selected.Name;
                }
                else if (nodetype == 'ResourcePart') {
                    $scope.formData.Name = $scope.formData.selected.Name;
                    $scope.formData.ResourceID = $scope.formData.selected.ID;
                    $scope.formData.selected = {};
                }

                var req = {
                    method: 'PUT',
                    url: globalServerURL + 'node/' + $scope.currentNode.ID + '/',
                    data: $scope.formData,
                }
                $http(req).success(function(response) {
                    console.log(nodetype + " edited")
                    // check if the name has changed
                    if ($scope.currentNode.Name != $scope.formData.Name) {
                        $scope.currentNode.Name = $scope.formData.Name;
                        var parent = $scope.currentNodeScope.$parentNodeScope || {'$modelValue':{'NodeType':'Project'}};
                        // if sorting children of a project
                        if (parent.$modelValue.NodeType == 'Project') {
                            $scope.currentNodeScope.$parentNodesScope.$modelValue.sort(function(a, b) {
                                // makes sure the resource category stays the first item
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (a.NodeType == 'ResourceCategory') ? -1 :
                                            (b.NodeType == 'ResourceCategory') ? 0 :
                                                (textA < textB) ? -1 :
                                                    (textA > textB) ? 1 : 0;
                            });
                        }
                        else{
                            $scope.currentNodeScope.$parentNodesScope.$modelValue.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                        }
                        // if it is a project, change it in the projects list
                        if ($scope.currentNode.NodeType == 'Project'){
                            var result = $.grep($scope.projectsList, function(e) {
                                return e.ID == $scope.currentNode.ID;
                            });
                            var index = $scope.projectsList.indexOf(result[0]);
                            if (index>-1) {
                                $scope.projectsList[index].Name = $scope.currentNode.Name;
                            }
                            $scope.projectsList.sort(function(a, b) {
                                var textA = a.Name.toUpperCase();
                                var textB = b.Name.toUpperCase();
                                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                            });
                        }
                    }
                    $scope.currentNode.Description = $scope.formData.Description;
                    $scope.currentNode.Status = $scope.formData.Status;
                    $scope.handleReloadSlickgrid($scope.currentNode.ID);
                });
            }
        };

        // open a modal confirmation window
        $scope.deleteConfirmation = function(){
            $scope.modalInstance=$modal.open({
                templateUrl: 'deleteConfirmationModal.html',
                scope:$scope,
                backdrop : 'static'
            });
        };

        // Deleting a node. It receives the id of the node
        // The id is sent to the server to be deleted and the node
        // removed from the treemodel
        $scope.deleteThisNode = function ( nodeid ) {
            $scope.statusMessage("Deleting " + $scope.currentNode.Name, 0, 'alert-info');
            $http({
                method: 'DELETE',
                url:globalServerURL + 'node/' + nodeid + '/'
            }).success(function (response) {
                $scope.statusMessage("Deleted " + $scope.currentNode.Name, 2000, 'alert-info');
                if ($scope.currentNode.NodeType == 'Project') {
                    $scope.closeProject(nodeid);
                    // remove the project from the projects list
                    var result = $.grep($scope.projectsList, function(e) {
                        return e.ID == nodeid;
                    });
                    var index = $scope.projectsList.indexOf(result[0]);
                    if (index>-1) {
                        $scope.projectsList.splice(index, 1);
                    }
                }
                else {
                    $scope.nodeDeleted();
                }
            }).error(function() {
                console.log("Server error");
                $scope.statusMessage("Server error.", 2000, 'alert-warning');
            });
        };

        // Function to copy a node
        $scope.copyThisNode = function(node) {
            if ($scope.copiedNode){
                $scope.copiedNode.cut = false;
            }
            if ($scope.copiedRecords){
                for (var i in $scope.copiedRecords)
                    $scope.copiedRecords[i].cut = false;
            }
            $scope.statusMessage(node.Name + " copied.", 2000, 'alert-info');
            node.cut = false;
            $scope.copiedNode = node;
            console.log("Node id copied: " + node.ID);
        }

        // Function to cut a node
        // the node is styled to be transparent
        $scope.cutThisNode = function(node) {
            if ($scope.copiedNode){
                $scope.copiedNode.cut = false;
            }
            if ($scope.copiedRecords){
                for (var i in $scope.copiedRecords)
                    $scope.copiedRecords[i].cut = false;
            }
            $scope.statusMessage(node.Name + " cut.", 2000, 'alert-info');
            node.cut = true;
            $scope.copiedNode = node;
            // put the current node's parent in scope
            if ($scope.currentNodeScope.$nodeScope.$parentNodeScope){
                $scope.cutScope = $scope.currentNodeScope.$nodeScope.$parentNodeScope.$modelValue;
            }
            console.log("Node id cut: " + node.ID);
        }

        // handle pasting nodes
        $scope.pasteAction = function(node, selectionlist, index) {
            $http({
                method: 'POST',
                url: globalServerURL + 'node/' + node.ID + '/paste/',
                data:{'ID': $scope.copiedNode.ID,
                        'cut': $scope.copiedNode.cut,
                        'selections': selectionlist}
            }).success(function (response) {
                console.log('Success: Node pasted');
                // expand the node if this is its first child
                if ($scope.currentNode.Subitem.length == 0) {
                    $scope.currentNode.expanded = true;
                }
                // if a project was pasted into the root
                if ($scope.copiedNode.NodeType === 'Project') {
                    $scope.copiedNode.cut = false;
                    var newprojectid = response.newId;
                    $scope.statusMessage($scope.copiedNode.Name + " pasted.", 1000, 'alert-info');
                    // and add it to the open projects
                    $scope.projectAdded(response.node);
                }
                else if (index !== undefined) {
                    // if we pasted the last node of the copied records
                    if (index == $scope.copiedRecords.length-1) {
                        // if the nodes were cut remove them from their parent
                        if ($scope.copiedNode.cut){
                            for (var i in $scope.copiedRecords){
                                var result = $.grep($scope.cutScope.Subitem, function(e) {
                                    return e.ID == $scope.copiedRecords[i].ID;
                                });
                                var index = $scope.cutScope.Subitem.indexOf(result[0]);
                                if (index>-1) {
                                    $scope.cutScope.Subitem.splice(index, 1);
                                }
                            }
                            $scope.copiedRecords = undefined;
                            $scope.cutScope = undefined;
                        }
                        $scope.copiedNode = {'NodeType': 'Records'};
                        $scope.statusMessage("Records pasted.", 2000, 'alert-info');
                        $scope.handleReloadSlickgrid(node.ID);
                        $scope.loadNodeChildren(node.ID);
                    }
                }
                else {
                    $scope.statusMessage($scope.copiedNode.Name + " pasted.", 2000, 'alert-info');
                    $scope.handleReloadSlickgrid(node.ID);
                    // insert the copied/cut node in the correct destination without reloading
                    // all the children of the parent
                    var pastednode = response['node'];
                    if (!$scope.pastingFromDnd) {
                        // if the node was cut, remove it from its parent
                        if ($scope.copiedNode.cut){
                            var result = $.grep($scope.cutScope.Subitem, function(e) {
                                return e.ID == $scope.copiedNode.ID;
                            });
                            var index = $scope.cutScope.Subitem.indexOf(result[0]);
                            if (index>-1) {
                                $scope.cutScope.Subitem.splice(index, 1);
                            }
                        }
                        if (pastednode) {
                            // insert the newly created node in the correct place
                            var start = 0;
                            if ($scope.currentNode.NodeType == 'Project') {
                                start = 1;
                            }
                            var index = $scope.locationOf(pastednode, $scope.currentNode.Subitem, start);
                            $scope.currentNode.Subitem.splice(index, 0, pastednode)
                        }
                        else if (response.newId) {
                            // if the response id equals the current id
                            // it acts as a signal to reload the node
                            if (node.ID == response.newId) {
                                $scope.loadNodeChildren(node.ID);
                            }
                        }
                    }
                    // otherwise we pasted from a drop
                    else{
                        // check if the placeholder is in the parent, and remove it
                        var result = $.grep($scope.currentNode.Subitem, function(e) {
                            return e.NodeType == 'Default';
                        });
                        var index = $scope.currentNode.Subitem.indexOf(result[0]);
                        if (index>-1) {
                            $scope.currentNode.Subitem.splice(index, 1);
                            // placeholder means parent was an empty node
                            $scope.currentNode.Subitem[0] = pastednode;
                        }
                        else{
                            // find the DOM added node
                            var result = $.grep($scope.currentNode.Subitem, function(e) {
                                return e.destParent == $scope.currentNode.ID;
                            });
                            var index = $scope.currentNode.Subitem.indexOf(result[0]);
                            if (index>-1) {
                                $scope.currentNode.Subitem[index] = pastednode;
                            }
                        }
                    }
                    $scope.pastingFromDnd = false;
                }
                // if the node was cut remove it from scope
                if ($scope.copiedNode.cut){
                    $scope.copiedNode = undefined;
                }
            }).error(function() {
                console.log("Server error");
                $scope.statusMessage("Server error.", 2000, 'alert-warning');
            }).then(function() {
                if (index !== undefined) {
                    index+=1;
                    $scope.resolvePastePromise(node, index);
                }
            });
        };

        // loop over a list of duplicate resources and get the user action for each
        $scope.handleDuplicateResourceActions = function(node, duplicatelist, index) {
            var doAll = undefined;
            var overwrite = false;
            var keys = Object.keys(duplicatelist);

            var openModal = function() {
                var modalInstance = $modal.open({
                    templateUrl: 'duplicateConfirmationModal.html',
                    controller: duplicateModalController,
                    backdrop : 'static',
                    resolve: {
                        selections: function () {
                            return $scope.selections;
                        }
                    }
                });
                return modalInstance.result.then(function (selections) {
                    overwrite = selections.overwrite;
                    if (selections.doAll) {
                        doAll = selections.doAll;
                    }
                }, function () {
                    $scope.statusMessage("Stopped", 2000, 'alert-info');
                });
            };
            (function checkItems() {
                // get the first key and remove it from array
                var key = keys.shift();
                var duplicateResource = duplicatelist[key];
                if (doAll == undefined) {
                    // open the modal
                    $scope.selections = {'overwrite': overwrite,
                                        'doAll': doAll,
                                        'resourceName': duplicateResource.Name};
                    // continue when response from modal is returned
                    openModal().then(function() {
                        selectionlist[duplicateResource.Code] = overwrite;
                        if (keys.length) {
                            checkItems();
                        }
                        else {
                            $scope.pasteAction(node, selectionlist, index);
                        }
                    // modal dismissed, stop
                    },function () {
                        $scope.statusMessage("Stopped", 2000, 'alert-info');
                    });
                }
                else {
                    // skip has been selected
                    // set the overwrite to the skip value
                    selectionlist[duplicateResource.Code] = doAll;
                    if (keys.length) {
                        checkItems();
                    }
                    else {
                        $scope.pasteAction(node, selectionlist, index);
                    }
                }
            })();
        };

        // check if the rate and/or quantity is to be pasted
        $scope.checkRateAndQuantity = function(node, selections, index) {
            var openModal = function() {
                var modalInstance = $modal.open({
                    templateUrl: 'checkRateAndQuantityModal.html',
                    controller: checkRateAndQuantityController,
                    backdrop : 'static',
                    resolve: {
                        selections: function () {
                            return selections;
                        }
                    }
                });

                return modalInstance.result.then(function (sel) {
                    selections = sel;
                });
            };

            // if the selection has been made continue without opening modal
            if (index > 0){
                $scope.pasteAction(node, $scope.rateAndQuantityselections, index);
            }
            else{
                // continue when response from modal is returned
                openModal().then(function() {
                    if (index == 0){
                        $scope.rateAndQuantityselections = selections;
                    }
                    $scope.pasteAction(node, selections, index);
                // modal dismissed, stop
                },function () {
                    $scope.statusMessage("Stopped", 2000, 'alert-info');
                });
            }
        };

        // function to paste copied node into another node
        // the id is sent to the server and the node pasted there
        // the user can't paste into the same node
        $scope.pasteThisNode = function(node, index) {
            var cnode = $scope.copiedNode;
            var duplicatelist = undefined;
            var flag = false;
            if (cnode) {
                flag = true;
            }
            if (flag && (cnode.ID == node.ID)) {
                flag = false;
                console.log("You can't paste a node into itself");
                $scope.statusMessage("You can't paste a node into itself", 2000, 'alert-warning');
            }
            // check the allowed array for the types
            if (flag && ($scope.allowed[node.NodeType].indexOf(cnode.NodeType) == -1)) {
                flag = false;
                console.log("You can't paste a " + cnode.NodeType + " into a " + node.NodeType);
                $scope.statusMessage("You can't paste a " + cnode.NodeType + " into a " + node.NodeType, 2000, 'alert-warning');
                // if the index is set, paste the next record
                if (index !== undefined) {
                    index+=1;
                    $scope.resolvePastePromise(node, index);
                }
            }
            if (flag && cnode.cut) {
                $scope.statusMessage("Busy moving...", 0, 'alert-info');
            }
            else if (flag){
                $scope.statusMessage("Busy copying...", 0, 'alert-info');
            }
            if (flag){
                if ((cnode.NodeType == 'ResourceCategory') && (node.NodeType == 'ResourceCategory')) {
                    flag = false;
                    if (cnode.ParentID == node.ID) {
                        console.log("You can't paste a Resource Category into the same list");
                        $scope.statusMessage("You can't paste a Resource Category into the same list", 2000, 'alert-warning');
                        if (index !== undefined) {
                            index+=1;
                            $scope.resolvePastePromise(node, index);
                        }
                    }
                    else {
                        // get the resources in the copied category
                        $http.get(globalServerURL + 'resourcecategory/' + cnode.ID + '/resources/')
                        .success(function (response) {
                            var copiedresources = response;
                            // get the resources in the destination category
                            $http.get(globalServerURL + 'resourcecategory/' + node.ID + '/allresources/')
                            .success(function (response) {
                                duplicatelist = [];
                                selectionlist = {};
                                var destinationresources = response;
                                // get a list of the duplicate resources
                                for (var d in destinationresources) {
                                    for (var c in copiedresources) {
                                        if (copiedresources[c].Code == destinationresources[d].Code)
                                            duplicatelist.push(copiedresources[c]);
                                    }
                                }
                                if (duplicatelist.length > 0) {
                                    $scope.handleDuplicateResourceActions(node, duplicatelist, index);
                                }
                                else {
                                    $scope.pasteAction(node, {}, index);
                                }
                            });
                        });
                    }
                }
                else if(cnode.cut != true){
                    // for projects, budgetgroups, and budgetitems check quantities and rate
                    if (cnode.NodeType == 'Project'){
                        flag = false;
                        var selections = [{'Name': 'Quantity', 'selected': false},
                                            {'Name': 'Rate', 'selected': false}];
                        $scope.checkRateAndQuantity(node, selections, index);
                    }
                    else if (cnode.NodeType == 'BudgetGroup' || cnode.NodeType == 'BudgetItem' || cnode.NodeType == 'SimpleBudgetItem'){
                        flag = false;
                        var selections = [{'Name': 'Quantity', 'selected': false}];
                        $scope.checkRateAndQuantity(node, selections, index);
                    }
                }
            }
            if (flag) {
                $scope.pasteAction(node, {}, index);
            }
        };

        // when a node is deleted clear the slickgrid and remove it from the tree
        $scope.nodeDeleted = function() {
            $scope.currentNode = undefined;
            $scope.currentNodeScope.remove();
            $scope.handleClearSlickgrid();
        }

        // Load the children and add to the tree
        $scope.loadNodeChildren = function(parentid) {
            // if the parent id is 0 reload the projectslist
            if (parentid == 0) {
                $scope.preloadProjects();
            }
            else if ($scope.currentNode) {
                $http.get(globalServerURL + 'node/' + parentid + '/children/')
                .success(function(data) {
                    $scope.currentNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
        }

        $scope.budgetgroupList = [];

        $scope.loadBudgetItemTypes = function() {
            var bitypes = [];
            for (var i in $scope.restypeList) {
                bitypes.push({ID: $scope.restypeList[i].ID,
                    Name: $scope.restypeList[i].Name, selected: true})
            }
            $scope.budgetItemTypeList = bitypes;
            $scope.allBudgetItemTypes = true;
            $scope.printSelectedBudgetGroups = false;
            console.log("Budget Item Type list loaded");
        };

        $scope.loadSuppliers = function() {
            // load the suppliers list
            $scope.suppliersList = [{"Name": "Loading..."}];
            var req = {
                method: 'GET',
                url: globalServerURL + 'suppliers'
            }
            $http(req).success(function(data) {
                $scope.suppliersList = data;
            });
            console.log("Suppliers list loaded");
            $scope.filterBySupplier = false;
        };

        $scope.copySelectedRecords = function(node) {
            // put the id's of the selected records in an array
            if ($scope.rowsSelected) {
                $scope.cutScope = $scope.currentNode;
                $scope.toggleCopiedRecords($scope.getSelectedNodes(), false);
                $scope.copiedNode = {'NodeType': 'Records'};
                console.log("Records copied");
                $scope.statusMessage("Records copied.", 2000, 'alert-info');
            }
        };

        $scope.cutSelectedRecords = function(node) {
            // put the id's of the selected records in an array
            if ($scope.rowsSelected) {
                // put the current node, the parent, in scope
                $scope.cutScope = $scope.currentNode;
                var selectedRows = $scope.getSelectedNodes();
                $scope.toggleCopiedRecords(selectedRows, true);
                $scope.copiedNode = {'NodeType': 'Records'};
                // remove rows from slickgrid
                $scope.cutSelectedNodes(selectedRows);
                console.log("Records cut");
                $scope.statusMessage("Records cut.", 2000, 'alert-info');
            }
        };

        $scope.pasteSelectedRecords = function(node) {
            // start pasting each record
            $scope.resolvePastePromise(node, 0)
        };

        // after operation has finished on pasting a node, paste the next
        // selected node
        $scope.resolvePastePromise = function(node, index) {
            if (index < $scope.copiedRecords.length) {
                $scope.copiedNode = $scope.copiedRecords[index];
                $scope.pasteThisNode(node, index);
            }
        }

        $scope.deleteSelectedRecords = function(nodeid) {
            // all the currently selected records in the slickgrid are
            // deleted from the database and the grid is reloaded
            if ($scope.rowsSelected) {
                var selectedRows = $scope.getSelectedNodes()
                for (var i in selectedRows) {
                    $http({
                        method: 'DELETE',
                        url:globalServerURL + 'node/' + selectedRows[i].ID + '/'
                    }).success(function (response) {
                        // on the last loop reload the slickgrid and node
                        if (i == selectedRows.length-1) {
                            // if the deleted id equals the selected id
                            // simply remove it from the tree
                            if (nodeid == selectedRows[i].ID) {
                                $scope.nodeDeleted();
                            }
                            else {
                                $scope.loadNodeChildren(nodeid);
                                $scope.handleReloadSlickgrid(nodeid);
                            }
                            $scope.statusMessage("Deleted records", 2000, 'alert-info');
                            $scope.toggleRowsSelected(false);
                        }
                    });
                }
            }
        };

        $scope.toggleRowsSelected = function(rowsselected) {
            $timeout(function() {
                $scope.rowsSelected = rowsselected;
                if (rowsselected){
                    $scope.budgetActions();
                }
            });
        }

        // clear the previous copied data and set nodes copied/cut
        $scope.toggleCopiedRecords = function(copiedrecords, cut) {
            if ($scope.copiedNode){
                $scope.copiedNode.cut = false;
            }
            if ($scope.copiedRecords){
                for (var i in $scope.copiedRecords)
                    $scope.copiedRecords[i].cut = false;
            }
            $scope.copiedRecords = copiedrecords;
            for (var i in $scope.copiedRecords){
                $scope.copiedRecords[i].cut = cut;
                var result = $.grep($scope.cutScope.Subitem, function(e) {
                    return e.ID == $scope.copiedRecords[i].ID;
                });
                var index = $scope.cutScope.Subitem.indexOf(result[0]);
                if (index>-1) {
                    $scope.cutScope.Subitem[index].cut = cut;
                }
            }
        }

        // get the selected rows and determine if they are budgetgroups/items
        $scope.budgetActions = function(){
            var selectedRows = $scope.getSelectedNodes();
            var allbudgets = true;
            for (var i in selectedRows) {
                if (selectedRows[i].NodeType.indexOf("Budget") < 0){
                    allbudgets = false;
                    break;
                }
            }
            $scope.showBudgetActions = allbudgets;
        }

        $scope.applyMarkupToSelection = function(){
            var selectedRows = $scope.getSelectedNodes();
            var count = 0;
            for (var i in selectedRows) {
                var req = {
                    method: 'PUT',
                    url: globalServerURL + selectedRows[i].ID + '/overheads/',
                    data: {'overheadlist':$scope.budgetItemOverheadList}
                }
                $http(req).success(function() {
                    console.log("Overheads applied to " + selectedRows[count].ID);
                    if (count == selectedRows.length -1){
                        $scope.loadNodeChildren($scope.currentNode.ID);
                    }
                    count +=1;
                });
            }
        }

        // select all the budget item types (even none type ones)
        $scope.toggleAllBudgetItemTypes = function(){
            $scope.allBudgetItemTypes = !$scope.allBudgetItemTypes;
            if ($scope.allBudgetItemTypes){
                for (var i in $scope.budgetItemTypeList){
                    $scope.budgetItemTypeList[i].selected = true;
                }
            }
        }

        // toggle the selected budget item
        $scope.toggleBudgetItemType = function(btype){
            btype.selected = !btype.selected;
            $scope.allBudgetItemTypes = false;
        }

        $scope.openNodeList = [];
        // load the node that has been selected into the tree for pdf printing
        $scope.loadNodeForPrinting = function (id) {
            $scope.formData.LevelLimit = 1;
            $http.get(globalServerURL + 'node/' + id + '/')
            .success(function(data) {
                $scope.openNodeList = [data];
                $scope.selectReportNodeHead(data);
            });
        };

        $scope.setReportType = function(type){
            $scope.selectedReportType = type;
        }

        $scope.getReport = function (report, nodeid) {
            var target = document.getElementsByClassName('pdf_download');
            var spinner = new Spinner().spin(target[0]);
            if ( report == 'projectbudget' ) {
                $scope.formData['BudgetItemTypeList'] = $scope.budgetItemTypeList || [];
                $scope.formData.BudgetItemTypeList.unshift({'ID': 0, 'selected': $scope.allBudgetItemTypes});
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'project_budget_report/' + nodeid + '/'
            }
            else if ( report == 'costcomparison' ) {
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'cost_comparison_report/' + nodeid + '/'
            }
            else if ( report == 'resourcelist' ) {
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                var url = globalServerURL + 'resource_list_report/' + nodeid + '/'
            }
            else if (report == 'cashflow'){
                $scope.formData = {};
                var url = globalServerURL + 'cash_flow_report/' + nodeid + '/'
            }
            $http({
                method: 'POST',
                url: url,
                data: $scope.formData,
                responseType: 'arraybuffer'
            }).success(function (response, status, headers, config) {
                spinner.stop();
                var file = new Blob([response], {type: 'application/pdf'});
                var filename_header = headers('Content-Disposition');
                var filename = filename_header.split('filename=')[1];
                var config = {
                  data: file,
                  filename: filename,
                };

                FileSaver.saveAs(config);
            }).error(function(data, status, headers, config) {
                console.log("Report pdf download error")
            });
        };

        $scope.getExcelReport = function (report, nodeid) {
            var target = document.getElementsByClassName('excel_download');
            var spinner = new Spinner().spin(target[0]);
            if ( report == 'projectbudget' ) {
                $scope.formData['BudgetItemTypeList'] = $scope.budgetItemTypeList || [];
                $scope.formData.BudgetItemTypeList.unshift({'ID': 0, 'selected': $scope.allBudgetItemTypes});
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'excel_project_budget_report/' + nodeid + '/'
            }
            else if ( report == 'costcomparison' ) {
                $scope.formData['PrintSelectedBudgerGroups'] = $scope.printSelectedBudgetGroups;
                $scope.formData['BudgetGroupList'] = $scope.budgetgroupList || [];
                var url = globalServerURL + 'excel_cost_comparison_report/' + nodeid + '/'
            }
            else if ( report == 'resourcelist' ) {
                $scope.formData['FilterBySupplier'] = $scope.filterBySupplier;
                var url = globalServerURL + 'excel_resource_list_report/' + nodeid + '/'
            }
            else if (report == 'cashflow'){
                var url = globalServerURL + 'excel_cash_flow_report/' + nodeid + '/'
            }
            $http({
                method: 'POST',
                url: url,
                data: $scope.formData,
                responseType: 'arraybuffer'
            }).success(function (response, status, headers, config) {
                spinner.stop();
                var blob = new Blob([response], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                var filename_header = headers('Content-Disposition');
                var filename = filename_header.split('filename=')[1];
                var config = {
                  data: blob,
                  filename: filename,
                };

                FileSaver.saveAs(config);
            }).error(function(data, status, headers, config) {
                console.log("Report excel download error")
            });
        };

        $scope.toggleBudgetgroup = function(bgroup) {
            // set the budgetgroup selected or unselected
            var flag = (bgroup.selected === true) ? undefined : true;
            bgroup.selected = flag;
            // find the budgetgroup in the budgetgroup list
            var i = $scope.budgetgroupList.map(function(e)
                { return e.id; }).indexOf(bgroup.ID);
            // if the budgetgroup is already in the list
            // and the node is deselected
            if ((i>-1) &(!flag)) {
                // remove it
                $scope.budgetgroupList.splice(i, 1);
            }
            // if the budget group is not in the list
            // and the node is being selected
            else if ((i==-1) & flag) {
                // add the budgetgroup
                $scope.budgetgroupList.push(bgroup);
            }
        }

        // if node head clicks, get the children of the node
        // and collapse or expand the node
        $scope.selectReportNodeHead = function(selectedNode) {
            // if the node is collapsed, get the data and expand the node
            if (!selectedNode.expanded) {
                selectedNode.expanded = true;
                var parentid = selectedNode.ID;
                $http.get(globalServerURL + "reports/tree/" + parentid + '/').success(function(data) {
                    selectedNode.Subitem = data;
                    console.log("Children loaded");
                });
            }
            else {
                selectedNode.expanded = false;
            }
        };

        $scope.toggleCalculator = function() {
            $scope.calculatorHidden = !$scope.calculatorHidden;
        };

}]);

myApp.run(['$cacheFactory', function($cacheFactory) {
    $cacheFactory('optimate.resources')
}]);
