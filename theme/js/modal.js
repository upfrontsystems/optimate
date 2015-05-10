$(document).on('shown.bs.modal', function(){
     $('input#inputName').focus();
    // to init the related items widget when add component modal is loaded
    if ($('#addComponent').length && $('#addComponent').is(":visible") ) {
        $('.finder').each(function() {
            var url = $(this).attr('data-url');
            var finder = new ContentFinder('#'+$(this).attr('id'), url, true);
            finder.listdir(url);
        });
    }
});
