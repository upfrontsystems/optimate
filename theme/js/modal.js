$(document).on('shown.bs.modal', function(){
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
         $('#addBudgetgroupButton').focus();
     }
     if ( $('#saveOrderModal.in').length != 0 ) {
         $('#addComponentsButton').focus();
     }
});
