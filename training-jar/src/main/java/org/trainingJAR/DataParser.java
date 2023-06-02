package org.trainingJAR;

import org.datavec.api.records.reader.RecordReader;
import org.datavec.api.split.CollectionInputSplit;
import org.datavec.api.split.FileSplit;
import org.datavec.image.recordreader.ImageRecordReader;
import org.deeplearning4j.datasets.datavec.RecordReaderDataSetIterator;
import org.nd4j.linalg.dataset.api.iterator.DataSetIterator;
import org.nd4j.linalg.dataset.api.preprocessor.DataNormalization;
import org.nd4j.linalg.dataset.api.preprocessor.ImagePreProcessingScaler;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Paths;
import java.util.*;

public class DataParser {

    public static DataSetIterator createDataSetIterator (RecordReader recordReader, int numLabels)
            throws IOException, InterruptedException {
        DataSetIterator iterator = null;
        iterator = new RecordReaderDataSetIterator(recordReader, 1, 1, 1, true);

        DataNormalization scaler = new ImagePreProcessingScaler(0, 1);
        scaler.fit(iterator);
        iterator.setPreProcessor(scaler);

        return iterator;
    }

    public static List<URI> readFiles(String path, String ignore) {
        FileSplit allFiles = new FileSplit(new File(path));
        List<URI> filteredURIs = new ArrayList<>();
        for (URI uri : allFiles.locations()) {
            if (!Paths.get(uri).getFileName().toString().equals(ignore)) {
                filteredURIs.add(uri);
            }
        }

        return filteredURIs;
    }

    public static RecordReader generateRecordReader(int[] dataShape, List<URI> files, CSVLabelGenerator labelGenerator)
            throws IOException, InterruptedException {
        RecordReader recordReader = new ImageRecordReader(dataShape[1], dataShape[0], dataShape[2], labelGenerator);
        recordReader.initialize(new CollectionInputSplit(files));

        return recordReader;
    }
}
