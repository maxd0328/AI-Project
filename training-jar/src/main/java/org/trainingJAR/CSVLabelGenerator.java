package org.trainingJAR;

import org.datavec.api.io.labels.PathLabelGenerator;
import org.datavec.api.writable.NDArrayWritable;
import org.datavec.api.writable.Writable;
import org.nd4j.linalg.factory.Nd4j;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CSVLabelGenerator implements PathLabelGenerator {

    private boolean isNotRegression = true;
    private Map<String, Object> labels = new HashMap<>();
    private List<String> uniqueLabels;

    public CSVLabelGenerator(boolean isNotRegression, String path, String csvFile) throws IOException {
        this.isNotRegression = isNotRegression;

        uniqueLabels = new ArrayList<String>();
        BufferedReader reader = new BufferedReader(new FileReader(path + "/" + csvFile));
        String line;
        while ((line = reader.readLine()) != null) {
            String[] parts = line.split(",");
            if (parts.length < 2) {
                throw new IOException("Invalid line in CSV: " + line);
            }

            if (isNotRegression) {
                // Create a list of labels for each image.
                List<String> imageLabels = new ArrayList<>();
                for (int i = 1; i < parts.length; i++) {
                    imageLabels.add(parts[i].trim());
                    if (!uniqueLabels.contains(parts[i].trim())){
                        uniqueLabels.add(parts[i].trim());
                    }
                }
                labels.put(parts[0], imageLabels);
            }
            else {
                List<Double> labelValues = new ArrayList<>();
                for (int i = 1; i < parts.length; i++) {
                    labelValues.add(Double.parseDouble(parts[i].trim()));
                }
                labels.put(parts[0], labelValues);
            }
        }
    }

    public int getNumLabels() {
        return uniqueLabels.size();
    }
    @Override
    public Writable getLabelForPath(String path) {
        String filename = new File(path).getName();
        if (isNotRegression) {
            List<String> labelList = (List<String>) labels.get(filename);
            double[] labelVector = new double[uniqueLabels.size()];
            for (int i = 0; i < uniqueLabels.size(); i++) {
                if (labelList.contains(uniqueLabels.get(i))) {
                    labelVector[i] = 1;
                }
            }
            NDArrayWritable writable = new NDArrayWritable(Nd4j.create(labelVector, new int[]{1, getNumLabels()}));
            return writable;
        }
        else {
            List<Double> labelValues = (List<Double>) labels.get(filename);
            double[] labelArray = labelValues.stream().mapToDouble(i -> i).toArray();
            return new NDArrayWritable(Nd4j.create(labelArray, new int[]{1, getNumLabels()}));
        }
    }

    @Override
    public Writable getLabelForPath(URI uri) {
        return getLabelForPath(uri.getPath());
    }

    @Override
    public boolean inferLabelClasses() {
        return false;
    }
}
