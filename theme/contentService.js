angular.module('contentService', [])
.factory('contentService', function() {
    return {
        getItem: function(key, fetch) {
            return {"title": 'Some awsome title', "description": 'And an even better description'};
        }
    };
})
.directive('compile', function($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                return scope.$eval(attrs.compile);
            },
            function(value) {
                element.html(value);
                $compile(element.contents())(scope);
            }
        );
    };
})

.directive('aInfobox', ['$rootScope','$document', '$location', '$modal', function ($rootScope, $document, $location, $modal) {
  var openElement = null,
      closeModal   = angular.noop;
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      scope.$watch('$location.path', function() { closeModal(); });
      element.parent().bind('click', function() { closeModal(); });
      element.bind('click', function (event) {
console.log('aInfobox');
        var elementWasOpen = (element === openElement);

        var backdrop = false;
        //what type of infobox?
        if(attrs.oInfoBox === 'modal'){
            backdrop = true;
        }
        $rootScope.dlg = $modal.open({
            controller: function($scope, $modal, content){
                console.log('inside infobox controller', content);
                $scope.infobox = {title: content.title, body: content.description};
            },
            backdrop: backdrop,
            template: '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true" data-ng-click="closeDialog()">&times;</button><h1 compile="infobox.title"></h1></div><div class="modal-body" compile="infobox.body"></div>',
            resolve: {
                content: function(contentService){
                    //get content item and change page title
                    var result = contentService.getItem(attrs.href);
                    console.log('got content', result)
                    return result;
                }
            },
            windowClass: 'modal-content'
        })

    //apply -- without it the dialog won't appear until after the Text overlay is shown
    scope.$apply($rootScope.dlg);

        event.preventDefault();
        event.stopPropagation();

        if (!!openElement) {
          closeModal();
        }

        if (!elementWasOpen) {
          element.parent().addClass('open');
          openElement = element;
          closeModal = function (event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            $document.unbind('click', closeModal);
            element.parent().removeClass('open');
            closeModal = angular.noop;
            openElement = null;
          };
          $document.bind('click', closeModal);
        }
      });
    }
  };
}])
;
