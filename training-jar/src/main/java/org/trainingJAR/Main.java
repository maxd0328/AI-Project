package org.trainingJAR;

import org.apache.spark.SparkConf;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.datavec.api.records.reader.RecordReader;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.spark.api.TrainingMaster;
import org.deeplearning4j.spark.impl.multilayer.SparkDl4jMultiLayer;
import org.deeplearning4j.spark.parameterserver.training.SharedTrainingMaster;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.dataset.DataSet;
import org.nd4j.linalg.dataset.api.iterator.DataSetIterator;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SpringBootApplication
public class Main {

    public static boolean keepTraining;

    public static void main(String[] args) {
        /*
        args[0] = directory which contains the training data
        args[1] = the address of the file which contains the network parameters
        args[2] = the name of the s3 bucket where both are contained
        args[3] = the region
        args[4] = the public key
        args[5] = the private key
        args[6] = newTraining boolean
        args[7] = pathToNetwork
        */

        SpringApplication.run(Main.class, args);


        if (args.length != 6) {
            throw new RuntimeException("Number of arguments invalid.");
        }

        boolean newTraining = Boolean.parseBoolean(args[6]);

        keepTraining = true;

        S3Fetcher s3Fetcher = new S3Fetcher(args[4], args[5], args[2], args[3]);

        String configPath;
        String dataPath;
        configPath = s3Fetcher.downloadPath(args[1]);
        dataPath = s3Fetcher.downloadPath(args[0]);

        // initialize SparkContext
        SparkConf sparkConf = new SparkConf();
        sparkConf.setAppName("DL4J Spark Training");
        sparkConf.setMaster("local[*]");
        JavaSparkContext sc = new JavaSparkContext(sparkConf);

        try {
            Map<String, Object> params = JsonParser.getNetworkMap(configPath);
            boolean isNotRegression = JsonParser.isNotRegression(params);
            int[] dataShape = JsonParser.getDataShape(params);

            CSVLabelGenerator labelGenerator = new CSVLabelGenerator(isNotRegression, dataPath, "csvfile.txt");
            List<URI> files = DataParser.readFiles(dataPath, "csvfile.txt");
            RecordReader recordReader = DataParser.generateRecordReader(dataShape, files, labelGenerator);
            DataSetIterator dataIterator = DataParser.createDataSetIterator(recordReader, labelGenerator.getNumLabels());

            // Create a list to hold your DataSet objects
            List<DataSet> data = new ArrayList<>();
            while (dataIterator.hasNext()) {
                data.add(dataIterator.next());
            }

            JavaRDD<DataSet> dataRDD = sc.parallelize(data);

            TrainingMaster master = new SharedTrainingMaster.Builder(1).build();

            MultiLayerNetwork network;

            if (!newTraining) {
                network = new MultiLayerNetwork(JsonParser.parseNetworkFile(params));
                network.init();
            }
            else {
                network = ModelSerializer.restoreMultiLayerNetwork(s3Fetcher.downloadPath(args[7]));
            }

            SparkDl4jMultiLayer sparkNetwork = new SparkDl4jMultiLayer(sc, network, master);



            while(keepTraining) {
                sparkNetwork.fit(dataRDD);
            }

            String modelFileName = "newModel.zip";
            boolean saveUpdater = true; //Preserve optimizer's state for further training
            ModelSerializer.writeModel(network, modelFileName, saveUpdater);
            s3Fetcher.putObject(dataPath, modelFileName);


        } catch (IOException e) {
            throw new RuntimeException(e);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}