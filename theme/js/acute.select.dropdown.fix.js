// keep the dropdowns open on click
$(document).ready(function() {
    $(document).on('click', '.dropdown-menu', function (e) {
        // clicking on close-dropdown class closes it
        if (!$(e.target).hasClass('close-dropdown')){
            $(this).hasClass('keep-open') && e.stopPropagation();
        }
    });
});
