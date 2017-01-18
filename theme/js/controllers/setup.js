// controller for the Company Information data from the server
myApp.controller('companyinformationController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, $log, globalServerURL, SessionService) {

        toggleMenu('setup');

        $scope.currencies = [
            ['AED','United Arab Emirates','Dirhams',''],
            ['AFA','Afghanistan','Afghanis',''],
            ['ALL','Albania','Leke',''],
            ['AMD','Armenia','Drams',''],
            ['ANG','Netherlands Antilles','Guilders',''],
            ['AOA','Angola','Kwanza',''],
            ['ARS','Argentina','Pesos',''],
            ['AUD','Australia','Dollars','$'],
            ['AWG','Aruba','Guilders',''],
            ['AZM','Azerbaijan','Manats',''],
            ['BAM','Bosnia and Herzegovina','Convertible Marka',''],
            ['BBD','Barbados','Dollars','$'],
            ['BDT','Bangladesh','Taka',''],
            ['BGN','Bulgaria','Leva',''],
            ['BHD','Bahrain','Dinars',''],
            ['BIF','Burundi','Francs',''],
            ['BMD','Bermuda','Dollars','$'],
            ['BND','Brunei Darussalam','Dollars','$'],
            ['BOB','Bolivia','Bolivianos',''],
            ['BRL','Brazil','Brazil Real',''],
            ['BSD','Bahamas','Dollars','$'],
            ['BTN','Bhutan','Ngultrum',''],
            ['BWP','Botswana','Pulas',''],
            ['BYR','Belarus','Rubles',''],
            ['BZD','Belize','Dollars','$'],
            ['CAD','Canada','Dollars','$'],
            ['CDF','Congo/Kinshasa','Congolese Francs',''],
            ['CHF','Switzerland','Francs',''],
            ['CLP','Chile','Pesos',''],
            ['CNY','China','Yuan Renminbi',''],
            ['COP','Colombia','Pesos',''],
            ['CRC','Costa Rica','Colones','₡'],
            ['CUP','Cuba','Pesos',''],
            ['CVE','Cape Verde','Escudos',''],
            ['CYP','Cyprus','Pounds',''],
            ['CZK','Czech Republic','Koruny',''],
            ['DJF','Djibouti','Francs',''],
            ['DKK','Denmark','Kroner',''],
            ['DOP','Dominican Republic','Pesos',''],
            ['DZD','Algeria','Algeria Dinars',''],
            ['EEK','Estonia','Krooni',''],
            ['EGP','Egypt','Pounds',''],
            ['ERN','Eritrea','Nakfa',''],
            ['ETB','Ethiopia','Birr',''],
            ['EUR','Euro Member Countries','Euro','€'],
            ['FJD','Fiji','Dollars','$'],
            ['FKP','Falkland Islands [Malvinas]','Pounds',''],
            ['GBP','United Kingdom','Pounds','£'],
            ['GEL','Georgia','Lari',''],
            ['GGP','Guernsey','Pounds',''],
            ['GHC','Ghana','Cedis',''],
            ['GIP','Gibraltar','Pounds',''],
            ['GMD','Gambia','Dalasi',''],
            ['GNF','Guinea','Francs',''],
            ['GTQ','Guatemala','Quetzales',''],
            ['GYD','Guyana','Dollars','$'],
            ['HKD','Hong Kong','Dollars','HK$'],
            ['HNL','Honduras','Lempiras',''],
            ['HRK','Croatia','Kuna',''],
            ['HTG','Haiti','Gourdes',''],
            ['HUF','Hungary','Forint',''],
            ['IDR','Indonesia','Rupiahs',''],
            ['ILS','Israel','New Shekels','₪'],
            ['IMP','Isle of Man','Pounds',''],
            ['INR','India','Rupees','₹'],
            ['IQD','Iraq','Dinars',''],
            ['IRR','Iran','Rials',''],
            ['ISK','Iceland','Kronur',''],
            ['JEP','Jersey','Pounds',''],
            ['JMD','Jamaica','Dollars','$'],
            ['JOD','Jordan','Dinars',''],
            ['JPY','Japan','Yen','¥'],
            ['KES','Kenya','Shillings',''],
            ['KGS','Kyrgyzstan','Soms',''],
            ['KHR','Cambodia','Riels',''],
            ['KMF','Comoros','Francs',''],
            ['KPW','Korea [North]','Won', '₩'],
            ['KRW','Korea [South]','Won','₩'],
            ['KWD','Kuwait','Dinars',''],
            ['KYD','Cayman Islands','Dollars','$'],
            ['KZT','Kazakstan','Tenge',''],
            ['LAK','Laos','Kips',''],
            ['LBP','Lebanon','Pounds',''],
            ['LKR','Sri Lanka','Rupees','₹'],
            ['LRD','Liberia','Dollars','L$'],
            ['LSL','Lesotho','Maloti',''],
            ['LTL','Lithuania','Litai',''],
            ['LVL','Latvia','Lati',''],
            ['LYD','Libya','Dinars',''],
            ['MAD','Morocco','Dirhams',''],
            ['MDL','Moldova','Lei',''],
            ['MGA','Madagascar','Ariary',''],
            ['MKD','Macedonia','Denars',''],
            ['MMK','Myanmar [Burma]','Kyats',''],
            ['MNT','Mongolia','Tugriks',''],
            ['MOP','Macau','Patacas',''],
            ['MRO','Mauritania','Ouguiyas',''],
            ['MTL','Malta','Liri',''],
            ['MUR','Mauritius','Rupees','₹'],
            ['MVR','Maldives [Maldive Islands]','Rufiyaa',''],
            ['MWK','Malawi','Kwachas',''],
            ['MXN','Mexico','Pesos',''],
            ['MYR','Malaysia','Ringgits',''],
            ['MZM','Mozambique','Meticais',''],
            ['NAD','Namibia','Dollars','N$'],
            ['NGN','Nigeria','Nairas','₦'],
            ['NIO','Nicaragua','Gold Cordobas',''],
            ['NOK','Norway','Krone',''],
            ['NPR','Nepal','Nepal Rupees','₹'],
            ['NZD','New Zealand','Dollars','$'],
            ['OMR','Oman','Rials',''],
            ['PAB','Panama','Balboa',''],
            ['PEN','Peru','Nuevos Soles',''],
            ['PGK','Papua New Guinea','Kina',''],
            ['PHP','Philippines','Pesos','₱'],
            ['PKR','Pakistan','Rupees','₹'],
            ['PLN','Poland','Zlotych','zł'],
            ['PYG','Paraguay','Guarani','₲'],
            ['QAR','Qatar','Rials',''],
            ['ROL','Romania','Lei',''],
            ['RUR','Russia','Rubles',''],
            ['RWF','Rwanda','Rwanda Francs',''],
            ['SAR','Saudi Arabia','Riyals',''],
            ['SBD','Solomon Islands','Dollars','SI$'],
            ['SCR','Seychelles','Rupees','₹'],
            ['SDD','Sudan','Dinars',''],
            ['SEK','Sweden','Kronor',''],
            ['SGD','Singapore','Dollars','S$'],
            ['SHP','Saint Helena','Pounds',''],
            ['SIT','Slovenia','Tolars',''],
            ['SKK','Slovakia','Koruny',''],
            ['SLL','Sierra Leone','Leones',''],
            ['SOS','Somalia','Shillings',''],
            ['SPL','Seborga','Luigini',''],
            ['SRG','Suriname','Guilders',''],
            ['STD','S\xe3o Tome and Principe','Dobras',''],
            ['SVC','El Salvador','Colones',''],
            ['SYP','Syria','Pounds',''],
            ['SZL','Swaziland','Emalangeni',''],
            ['THB','Thailand','Baht','฿'],
            ['TJS','Tajikistan','Somoni',''],
            ['TMM','Turkmenistan','Manats',''],
            ['TND','Tunisia','Dinars',''],
            ['TOP','Tonga',"Pa'anga",''],
            ['TRL','Turkey','Liras','₺'],
            ['TTD','Trinidad and Tobago','Dollars','$'],
            ['TVD','Tuvalu','Tuvalu Dollars','$'],
            ['TWD','Taiwan','New Dollars','NT$'],
            ['TZS','Tanzania','Shillings',''],
            ['UAH','Ukraine','Hryvnia','₴'],
            ['UGX','Uganda','Shillings',''],
            ['USD','United States of America','Dollars','$'],
            ['UYU','Uruguay','Pesos',''],
            ['UZS','Uzbekistan','Sums',''],
            ['VEB','Venezuela','Bolivares',''],
            ['VND','Viet Nam','Dong','₫'],
            ['VUV','Vanuatu','Vatu',''],
            ['WST','Samoa','Tala',''],
            ['XAF','Communauté Financière Africaine BEAC','Francs',''],
            ['XAG','Silver','Ounces',''],
            ['XAU','Gold','Ounces',''],
            ['XCD','East Caribbean Dollars','Dollars','$'],
            ['XDR','International Monetary Fund [IMF] Special Drawing Rights','',''],
            ['XOF','Communauté Financière Africaine BCEAO','Francs',''],
            ['XPD','Palladium Ounces','',''],
            ['XPF','Comptoirs Français du Pacifique','Francs',''],
            ['XPT','Platinum','Ounces',''],
            ['YER','Yemen','Rials',''],
            ['YUM','Yugoslavia','New Dinars',''],
            ['ZAR','South Africa','Rand','R'],
            ['ZMK','Zambia','Kwacha',''],
            ['ZWD','Zimbabwe','Zimbabwe Dollars','$']
        ]
        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $http.get(globalServerURL + 'company_information').success(function(data) {
            $scope.company_information = data;
        });

        // When the edit button is pressed change the state and set the data
        $scope.editingState = function () {
            $http({
                method: 'GET',
                url: globalServerURL + 'company_information'
            }).success(function(response) {
                $scope.formData = response;
            })
            // set each field dirty
            angular.forEach($scope.EditCompanyInformationForm.$error.required, function(field) {
                field.$setDirty();
            });
        }

        // editing company information data
        $scope.save = function() {
            $http({
                method: 'PUT',
                url: globalServerURL + 'company_information',
                data: $scope.formData
            }).success(function(response) {
                $scope.company_information = $scope.formData;
                console.log("Company information saved");
            });
            $scope.EditCompanyInformationForm.$setPristine();
        };


        $scope.headerUpload = function(element){
            var reader = new FileReader();
            reader.onload = function(e){
                $scope.$apply(function() {
                    $scope.formData.Header = e.target.result;
                });
            };
            reader.readAsDataURL(element.files[0]);
        }

        $scope.footerUpload = function(element){
            var reader = new FileReader();
            reader.onload = function(e){
                $scope.$apply(function() {
                    $scope.formData.Footer = e.target.result;
                });
            };
            reader.readAsDataURL(element.files[0]);
        }
    }
]);



// controller for the Cities data
myApp.controller('citiesController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, $log, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.newItem = {};
        $scope.cityList = [];
        $scope.selectedItem = undefined;
        $scope.filters = {};

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $scope.loadCities = function() {
            $http.get(globalServerURL + 'cities')
            .success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };
        $scope.loadCities();

        $scope.showActionsFor = function(item){
            if ($scope.selectedItem){
                $scope.selectedItem.active = undefined;
            }
            item.active = 'active';
            $scope.selectedItem = item;
        };

        $scope.setState = function(state, item){
            $scope.focusInput = true;
            $scope.savingState = state;
            $scope.newItem = item;
        }

        // delete a city by id
        $scope.deleteCity = function() {
            if ($scope.selectedItem){
                var req = {
                    method: 'DELETE',
                    url: globalServerURL + 'city/' + $scope.selectedItem.ID + '/',
                }
                $http(req).success(function(result) {
                    for (var i = 0; i < $scope.cityList.length; i++) {
                        if ($scope.cityList[i].ID === $scope.selectedItem.ID) {
                            $scope.cityList.splice(i, 1);
                            break;
                        }
                    }
                    $scope.selectedItem = undefined;
                    $scope.savingState = undefined;
                    console.log("City deleted");
                });
            }
        }

        // add a city
        $scope.addCity = function() {
            if ($scope.newItem) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'city/0/',
                    data: {'Name':$scope.newItem.Name}
                }
                $http(req).success(function() {
                    $scope.savingState = undefined;
                    $scope.selectedItem = undefined;
                    $scope.loadCities();
                    console.log("City added");
                });
            }
        }

        // edit a city
        $scope.editCity = function() {
            if ($scope.newItem) {
                var req = {
                    method: 'PUT',
                    url: globalServerURL + 'city/' + $scope.newItem.ID + '/',
                    data: {'Name':$scope.newItem.Name}
                }
                $http(req).success(function() {
                    $scope.selectedItem.Name = $scope.newItem.Name;
                    $scope.savingState = undefined;
                    $scope.cityList.sort(function(a, b) {
                        var textA = a.Name.toUpperCase();
                        var textB = b.Name.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });
                    console.log("City edited");
                });
            }
        }

    }
]);

// controller for the Units data
myApp.controller('unitsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, $log, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.newUnit = {};
        $scope.unitList = [];
        $scope.selectedItem = undefined;
        $scope.filters = {};

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $scope.loadUnits = function(){
            $http.get(globalServerURL + 'units').success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        }
        $scope.loadUnits()

        $scope.showActionsFor = function(item){
            if ($scope.selectedItem){
                $scope.selectedItem.active = undefined;
            }
            item.active = 'active';
            $scope.selectedItem = item;
        };

        $scope.setState = function(state, item){
            $scope.focusInput = true;
            $scope.savingState = state;
            $scope.newUnit = item;
        }

        // delete a unit by id
        $scope.deleteUnit = function() {
            if ($scope.selectedItem){
                var req = {
                    method: 'DELETE',
                    url: globalServerURL + 'unit/' + $scope.selectedItem.ID + '/',
                }
                $http(req).success(function(result) {
                    for (var i = 0; i < $scope.unitList.length; i++) {
                        if ($scope.unitList[i].ID === $scope.selectedItem.ID) {
                            $scope.unitList.splice(i, 1);
                            break;
                        }
                    }
                    $scope.selectedItem = undefined;
                    $scope.savingState = undefined;
                    console.log("Unit deleted");
                });
            }
        }

        // add a unit
        $scope.addUnit = function() {
            if ($scope.newUnit) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'unit/0/',
                    data: {'Name':$scope.newUnit.Name}
                }
                $http(req).success(function(response) {
                    $scope.savingState = undefined;
                    $scope.selectedItem = undefined;
                    $scope.loadUnits();
                    console.log("Unit added");
                });
            }
        }

        // edit a unit
        $scope.editUnit = function() {
            if ($scope.newUnit) {
                var req = {
                    method: 'PUT',
                    url: globalServerURL + 'unit/' + $scope.newUnit.ID + '/',
                    data: {'Name':$scope.newUnit.Name}
                }
                $http(req).success(function() {
                    $scope.selectedItem.Name = $scope.newUnit.Name;
                    $scope.savingState = undefined;
                    $scope.unitList.sort(function(a, b) {
                        var textA = a.Name.toUpperCase();
                        var textB = b.Name.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });
                    console.log("Unit edited");
                });
            }
        }
    }
]);
