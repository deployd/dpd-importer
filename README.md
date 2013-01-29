## dpd-importer

Create deployd collections from existing mongo collections.

### usage

Create a project. Then install the dpd-importer module.

    dpd create my-app
    cd my-app
    npm install shelljs dpd-importer
    dpd -d
    
Click the green new resource and choose **Importer**.

Give it the default name "/importer". Open it by clicking "IMPORTER" in the left menu.

Enter the information of your old MongoDB server. Clicking on **Start Import** will start creating deployd collections from data in the provided db by streaming data directly from the old db into your new deployd db.

