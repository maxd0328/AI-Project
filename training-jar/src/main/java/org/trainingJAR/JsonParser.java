package org.trainingJAR;

import com.amazonaws.services.s3.model.transform.SelectObjectContentEventUnmarshaller;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.deeplearning4j.nn.api.Updater;
import org.deeplearning4j.nn.conf.ConvolutionMode;
import org.deeplearning4j.nn.conf.InputPreProcessor;
import org.deeplearning4j.nn.conf.MultiLayerConfiguration;
import org.deeplearning4j.nn.conf.NeuralNetConfiguration;
import org.deeplearning4j.nn.conf.inputs.InputType;
import org.deeplearning4j.nn.conf.layers.*;
import org.deeplearning4j.nn.conf.preprocessor.CnnToFeedForwardPreProcessor;
import org.deeplearning4j.nn.conf.preprocessor.FeedForwardToCnnPreProcessor;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.nd4j.linalg.activations.Activation;
import org.nd4j.linalg.api.ops.random.impl.BinomialDistributionEx;
import org.nd4j.linalg.learning.config.*;
import org.nd4j.linalg.lossfunctions.LossFunctions;
import scala.Int;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.lang.reflect.Array;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class JsonParser {

    public static OutputLayer outputLayer;
    public static MultiLayerConfiguration parseNetworkFile(Map<String, Object> params) throws IOException {
        List<Map<String, Object>> listLayers = getLayerMaps(params);
        List<Map<String, Object>> listPreProcessors = new ArrayList<Map<String, Object>>();
        int[] dataShape = getDataShape(params);
        int outputs = (int)params.get("outputs");

        NeuralNetConfiguration.Builder builder = new NeuralNetConfiguration.Builder()
                .activation(Activation.valueOf((String)params.get("activation"))).updater(getUpdater(params));

        NeuralNetConfiguration.ListBuilder listBuilder = builder.list();

        for (int i = 0; i < listLayers.size(); i++) {
            listPreProcessors.add(addLayer(listBuilder, i, listLayers, outputs));
        }

        for (int i = 0; i < listPreProcessors.size(); i++) {
            Map<String, Object> map = listPreProcessors.get(i);
            if (map != null) {
                listBuilder.inputPreProcessor((int)map.get("index"), getPreProcessor(map));
            }
        }

        if (((String)listLayers.get(0).get("type")).equalsIgnoreCase("dense")){
            listBuilder.setInputType(InputType.feedForward(dataShape[0]));
        }
        else {
            listBuilder.setInputType(InputType.convolutional(dataShape[0], dataShape[1], dataShape[2]));
        }

        MultiLayerConfiguration configuration = listBuilder.build();

        configuration.getConf(configuration.getConfs().size()).setLayer(outputLayer);

        return configuration;
    }

    public static Map<String, Object> getNetworkMap(String path) {
        String jsonNetwork = stringify(path);
        Map<String, Object> params = generateMap(jsonNetwork);
        return params;
    }

    public static int[] getDataShape(Map<String, Object> params) {
        ArrayList<Integer> shape = (ArrayList<Integer>)params.get("dataShape");
        return shape.stream().mapToInt(i -> i).toArray();
    }

    public static boolean isNotRegression(Map<String, Object> params) {
        return (boolean)params.get("isNotRegression");
    }

    public static String stringify(String path) {
        String content = "";
        try {
            content = new String(Files.readAllBytes(Paths.get(path)));
        } catch (IOException e) {
            e.printStackTrace();
        }
        return content;
    }

    public static Map<String, Object> generateMap(String content) {
        ObjectMapper objectMapper = new ObjectMapper();
        Map<String, Object> map = null;
        try {
            map = objectMapper.readValue(content, Map.class);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return map;
    }

    public static List<Map<String, Object>> getLayerMaps(Map<String, Object> globalMap) {
        List<Map<String, Object>> layerList = new ArrayList<Map<String, Object>>();
        for (Map.Entry<String, Object> entry : globalMap.entrySet()) {
            if (entry.getValue() instanceof LinkedHashMap) {
                layerList.add((Integer)((Map<String, Object>) entry.getValue()).get("index"),
                        (Map<String, Object>) entry.getValue());
            }
        }

        return layerList;
    }

    public static Map<String, Object> addLayer(NeuralNetConfiguration.ListBuilder listBuilder, int index,
                                               List<Map<String, Object>> listLayers, int outputs) {
        Map<String, Object> layerMap = listLayers.get(index);
        Map<String, Object> nextLayerMap = null;
        Map<String, Object> preprocessor = null;
        if (listLayers.size() > index + 1) {
            nextLayerMap = listLayers.get(index + 1);
        }
        String type = ((String)layerMap.get("type")).toLowerCase();

        if (type.equalsIgnoreCase("convolutional")) {

            ConvolutionLayer.Builder layerBuilder = new ConvolutionLayer.Builder().kernelSize(completeArray(layerMap, "filterShape"))
                    .nOut((int) layerMap.get("filterChannels")).stride(completeArray(layerMap, "stride"));

            if (layerMap.containsKey("activation")) {
                layerBuilder.activation(Activation.valueOf(((String) layerMap.get("activation")).toUpperCase()));
            }

            if (((String) layerMap.get("convolutionMode")).equalsIgnoreCase("truncated")) {
                layerBuilder.padding(completeArray(layerMap, "paddingShape")).convolutionMode(ConvolutionMode.Truncate);
            } else if (((String) layerMap.get("convolutionMode")).equalsIgnoreCase("same")) {
                layerBuilder.convolutionMode(ConvolutionMode.Same);
            }

            if (layerMap.containsKey("dropoutRate")) {
                layerBuilder.dropOut((double) layerMap.get("dropoutRate"));
            }
            if (layerMap.containsKey("regularisationRateL1")) {
                layerBuilder.l1((double) layerMap.get("regularisationRateL1"));
            }
            if (layerMap.containsKey("regularisationRateL2")) {
                layerBuilder.l2((double) layerMap.get("regularisationRateL2"));
            }

            listBuilder.layer(index, layerBuilder.build());

            if (nextLayerMap != null &&
                    (((String) nextLayerMap.get("type")).equalsIgnoreCase("dense") ||
                            ((String) nextLayerMap.get("type")).equalsIgnoreCase("output"))) {
                preprocessor = buildPreProcessor("convolutional", index + 1);
            }
        }
        else if (type.equalsIgnoreCase("pooling")) {

            SubsamplingLayer.Builder layerBuilder = new SubsamplingLayer.Builder().kernelSize(completeArray(layerMap, "poolingShape"))
                    .stride(completeArray(layerMap, "stride"))
                    .poolingType(PoolingType.valueOf(((String) layerMap.get("poolingType")).toUpperCase()));

            if (((String) layerMap.get("convolutionMode")).equalsIgnoreCase("truncated")) {
                layerBuilder.padding(completeArray(layerMap, "paddingShape")).convolutionMode(ConvolutionMode.Truncate);
            } else if (((String) layerMap.get("convolutionMode")).equalsIgnoreCase("same")) {
                layerBuilder.convolutionMode(ConvolutionMode.Same);
            }

            if (layerMap.containsKey("dropoutRate")) {
                layerBuilder.dropOut((double) layerMap.get("dropoutRate"));
            }

            listBuilder.layer(index, layerBuilder.build());

            if (nextLayerMap != null &&
                    (((String) nextLayerMap.get("type")).equalsIgnoreCase("dense") ||
                            ((String) nextLayerMap.get("type")).equalsIgnoreCase("output"))) {
                preprocessor = buildPreProcessor("pooling", index + 1);
            }
        }
        else if (type.equalsIgnoreCase("dense")) {

            DenseLayer.Builder layerBuilder = new DenseLayer.Builder().nOut((int)layerMap.get("outputs"));

            if (layerMap.containsKey("activation")) {
                layerBuilder.activation(Activation.valueOf(((String) layerMap.get("activation")).toUpperCase()));
            }

            if (layerMap.containsKey("dropoutRate")) {
                layerBuilder.dropOut((double) layerMap.get("dropoutRate"));
            }
            if (layerMap.containsKey("regularisationRateL1")) {
                layerBuilder.l1((double) layerMap.get("regularisationRateL1"));
            }
            if (layerMap.containsKey("regularisationRateL2")) {
                layerBuilder.l2((double) layerMap.get("regularisationRateL2"));
            }

            listBuilder.layer(index, layerBuilder.build());

            if (nextLayerMap != null &&
                    (((String) nextLayerMap.get("type")).equalsIgnoreCase("convolutional") ||
                    ((String) nextLayerMap.get("type")).equalsIgnoreCase("pooling"))) {
                preprocessor = buildPreProcessor("dense", index + 1);
                int n = (int)layerMap.get("outputs");
                int width = (int) Math.floor(Math.sqrt(n));
                while (n % width != 0) {
                    width--;
                }
                int height = n / width;
                preprocessor.put("width", width);
                preprocessor.put("height", height);
            }
        }
        else if (type.equalsIgnoreCase("output")) {

            OutputLayer.Builder layerBuilder = new OutputLayer.Builder().nOut(outputs)
                    .lossFunction(LossFunctions.LossFunction.valueOf(((String)layerMap.get("lossFunction")).toUpperCase()));

            if (layerMap.containsKey("activation")) {
                layerBuilder.activation(Activation.valueOf(((String) layerMap.get("activation")).toUpperCase()));
            }

            if (layerMap.containsKey("dropoutRate")) {
                layerBuilder.dropOut((double) layerMap.get("dropoutRate"));
            }
            if (layerMap.containsKey("regularisationRateL1")) {
                layerBuilder.l1((double) layerMap.get("regularisationRateL1"));
            }
            if (layerMap.containsKey("regularisationRateL2")) {
                layerBuilder.l2((double) layerMap.get("regularisationRateL2"));
            }

            outputLayer = layerBuilder.build();
        }
        return preprocessor;
    }

    public static int[] completeArray(Map<String, Object> layer, String key) {
        int[] defaultDataShape = {64, 64, 3, 1};
        int[] defaultOtherShape = {1, 1};

        int expectedLength = key.equals("dataShape") ? 4 : 2;
        int[] defaultValues = key.equals("dataShape") ? defaultDataShape : defaultOtherShape;

        if (!layer.containsKey(key)) {
            return defaultValues;
        }

        Object value = layer.get(key);
        if (value instanceof ArrayList) {
            value = ((ArrayList<Integer>)value).stream().mapToInt(i -> i).toArray();
        }
        if (!(value instanceof int[])) {
            throw new IllegalArgumentException("The value must be an int array");
        }

        int[] array = (int[]) value;
        if (array.length == expectedLength) {
            return array;
        }
        if (array.length == 0) {
            return defaultValues;
        }

        int[] newArray = new int[expectedLength];
        for (int i = 0; i < newArray.length; i++) {
            if (i < array.length) {
                newArray[i] = array[i];
            } else if (i < 2) {
                newArray[i] = array[0]; // Fill with the first value
            } else {
                newArray[i] = 1; // Fill with 1 for dataShape beyond the second position, and for other keys
            }
        }

        return newArray;
    }

    public static IUpdater getUpdater(Map<String, Object> params) {
        String updaterString = (String)params.get("updater");
        IUpdater updater = null;
        if (updaterString.equalsIgnoreCase("adam")) {
            updater = new Adam();
        }
        else if (updaterString.equalsIgnoreCase("adagrad")) {
            updater = new AdaGrad();
        }
        else if (updaterString.equalsIgnoreCase("adadelta")) {
            updater = new AdaDelta();
        }
        else if (updaterString.equalsIgnoreCase("adamax")) {
            updater = new AdaMax();
        }
        else if (updaterString.equalsIgnoreCase("nesterovs")) {
            updater = new Nesterovs();
        }
        else if (updaterString.equalsIgnoreCase("nesterovs")) {
            updater = new Nesterovs();
        }
        else if (updaterString.equalsIgnoreCase("rmsprop")) {
            updater = new RmsProp();
        }
        else if (updaterString.equalsIgnoreCase("sgd")) {
            updater = new Sgd();
        }
        else {
            updater = new Adam();
        }

        return updater;
    }

    public static InputPreProcessor getPreProcessor(Map<String, Object> map) {
        InputPreProcessor preProcessor = null;

        if (((String)map.get("type")).equalsIgnoreCase("cnnToFeedForward")) {
            preProcessor = new CnnToFeedForwardPreProcessor();
        }
        else if (((String)map.get("type")).equalsIgnoreCase("feedForwardToCnn")) {
            preProcessor = new FeedForwardToCnnPreProcessor((int)map.get("width"), (int)map.get("height"), 1);
        }

        return preProcessor;
    }

    public static Map<String, Object> buildPreProcessor(String type, int index) {
        if (type.equalsIgnoreCase("pooling") || type.equalsIgnoreCase("convolutional")) {
            Map<String, Object> preprocessor = new HashMap<String, Object>();
            preprocessor.put("type", "cnnToFeedForward");
            preprocessor.put("index", index);
            return preprocessor;
        }
        else if (type.equalsIgnoreCase("dense")) {
            Map<String, Object> preprocessor = new HashMap<String, Object>();
            preprocessor.put("type", "feedForwardToCnn");
            preprocessor.put("index", index);
            return preprocessor;
        }
        else {
            return null;
        }
    }
}
