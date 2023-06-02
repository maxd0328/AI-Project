package org.trainingJAR;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;

public class S3Fetcher {

    private final AmazonS3 s3client;

    private final String bucketName;

    public S3Fetcher(final String AWS_ACCESS_KEY, final String AWS_SECRET_KEY, final String BUCKET_NAME, final String REGION) {
        BasicAWSCredentials credentials = new BasicAWSCredentials(AWS_ACCESS_KEY, AWS_SECRET_KEY);
        s3client = AmazonS3ClientBuilder
                .standard()
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withRegion(REGION)
                .build();
        bucketName = BUCKET_NAME;
    }

    public String downloadPath(String path) {
        S3Object s3object = s3client.getObject(bucketName, path);
        String newPath = System.getProperty("user.dir") + File.separator + s3object.getKey();
        S3ObjectInputStream inputStream = s3object.getObjectContent();
        try {
            FileUtils.copyInputStreamToFile(inputStream,
                    new File(newPath));
            s3object.close();
        } catch (IOException e) {
            throw new RuntimeException("Something went wrong when downloading the s3 path.");
        }
        return newPath;
    }

    public void putObject(String s3path, String name) {
        s3client.putObject(new PutObjectRequest(bucketName, name, s3path));
    }

}
