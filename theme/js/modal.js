$(document).on('shown.bs.modal', function() {
     $('input#inputName').focus();
     if ( $('#addComponent.in').length != 0 ) {
         $('input#inputQuantity').focus();
     }
     if ( $('#resourceListReport.in').length != 0 ) {
         $('.custom-checkbox').focus();
     }
     if ( $('#projectBudgetReport.in').length != 0 ) {
         $('input#inputLevelLimit').focus();
     }
     if ( $('#costComparisonReport.in').length != 0 ) {
         $('input#inputLevelLimit').focus();
     }
     if ( $('#saveValuationModal.in').length != 0 ) {
         // disable the 'disabled version' of the project select
         $('.valuation-edit .chosen-container').off()
     }
     if ( $('#saveOrderModal.in').length != 0 ) {
         $('#addComponentsButton').focus();
         // disable the 'disabled version' of the project select
         $('.project-dropdown-disabled .chosen-container').off()
     }
     if ( $('#saveUser.in').length != 0 ) {
         $('#username').focus();
     }
});



