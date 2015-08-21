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
                $scope.company_information = $scope.formData
            });
            $scope.EditCompanyInformationForm.$setPristine();
        };

    }
]);



// controller for the Cities data
myApp.controller('citiesController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, $log, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.newCity = [];

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $http.get(globalServerURL + 'cities').success(function(data) {
            $scope.cityList = data;
        });

        // clear the city input fields
        $scope.clearInput = function() {
            $scope.newCity = [];
        }

        $scope.cityList = [];
        $scope.loadCities = function() {
            $http.get(globalServerURL + 'cities')
            .success(function(data) {
                $scope.cityList = data;
                console.log("City list loaded");
            });
        };

        // delete a city by id
        $scope.deleteCity = function(cityid, index) {
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'city/' + cityid + '/',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.cityList.splice(index, 1);
                    console.log("City deleted");
                }
            });
        }

        // add a city
        $scope.addCity = function() {
            if ($scope.newCity) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'city/0/',
                    data: {'Name':$scope.newCity.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadCities();
                    console.log("City added");
                });
            }
        }

    }
]);

// controller for the Units data
myApp.controller('unitsController', ['$scope', '$http', '$modal', '$log', 'globalServerURL', 'SessionService',
    function($scope, $http, $modal, $log, globalServerURL, SessionService) {

        toggleMenu('setup');
        $scope.newUnit = [];

        // get the user permissions
        $scope.user = {'username':SessionService.username()};
        SessionService.permissions().then(function(perm){
            $scope.user.permissions = perm;
        });

        $http.get(globalServerURL + 'units').success(function(data) {
            $scope.unitList = data;
            console.log("Unit list loaded");
        });

        // clear the unit input fields
        $scope.clearInput = function() {
            $scope.newUnit = undefined;
        }

        $scope.unitList = [];
        $scope.loadUnits = function() {
            var req = {
                method: 'GET',
                url: globalServerURL + 'units'
            }
            $http(req).success(function(data) {
                $scope.unitList = data;
                console.log("Unit list loaded");
            });
        };

        // delete a unit by id
        $scope.deleteUnit = function(unitid, index) {
            var req = {
                method: 'DELETE',
                url: globalServerURL + 'unit/' + unitid + '/',
            }
            $http(req).success(function(result) {
                if ( result.status == 'remove' ) {
                    $scope.unitList.splice(index, 1);
                    console.log("Unit deleted");
                }
            });
        }

        // add a unit
        $scope.addUnit = function() {
            if ($scope.newUnit) {
                var req = {
                    method: 'POST',
                    url: globalServerURL + 'unit/0/',
                    data: {'Name':$scope.newUnit.Name}
                }
                $http(req).success(function() {
                    $scope.clearInput();
                    $scope.loadUnits();
                    console.log("Unit added");
                });
            }
        }

    }
]);
