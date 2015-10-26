describe('Valuations page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/valuations');
    });

    // tests its on the valuations page
    it('should be on the valuations page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/valuations');
    });

    // add a valuation
    it('should add a valuation', function(){
        // open the add valuation modal and fill in the form
        var addValuationModal = element(by.id('saveValuationModal'));
        var projectname = "TestProject";
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(addValuationModal.isDisplayed()).toBe(true);
        var projectselect = addValuationModal.element(by.id('inputProject_chosen'))
        projectselect.click();
        browser.actions().sendKeys(projectname).perform();
        projectselect.all(by.css('.chosen-results li')).then(function(items) {
            items[0].click();
        });

        addValuationModal.element(by.css('#inputDate i.fa-calendar')).click();
        addValuationModal.element(by.css('#inputDate ul table tbody tr td.day.active')).click();
        browser.waitForAngular();
        // add the percentage in the slickgrid
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(2) > div:nth-child(3)')).click();
        addValuationModal.element(by.css('.editor-text')).sendKeys(80);
        addValuationModal.element(by.css('div.ui-widget-content:nth-child(4) > div:nth-child(4)')).click();
        addValuationModal.element(by.buttonText('Save')).click();

        // check the valuation was added
        element(by.repeater('obj in jsonvaluations').row(0).column('obj.Project')).getText().then(function(name){
            expect(name).toBe(projectname);
        });
    });
});
