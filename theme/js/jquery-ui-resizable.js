$(document).ready(function() {
  // init
  var leftPanel = $("#left_slide_panel");
  var resize= $("#left");
  var containerWidth = $("#costs").width();

  $(resize).resizable({
        handles: 'e',
        maxWidth: (containerWidth - 30),
        minWidth: 30,
        resize: function(event, ui){
            var currentWidth = ui.size.width;

            // this accounts for some lag in the ui.size value, if you take this away
            // you'll get some instable behaviour
            $(this).width(currentWidth);

            // set the content panel width
            $("#right").width(containerWidth - currentWidth);
        }
  });
});
