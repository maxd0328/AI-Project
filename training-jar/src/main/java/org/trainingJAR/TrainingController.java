package org.trainingJAR;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicHeader;
import org.apache.http.protocol.HTTP;
import org.json.JSONObject;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/training")
public class TrainingController {

    @PostMapping("/stop")
    public String stopTraining() {
        Main.keepTraining = false;
        return "Training stopped";
    }

    public static void sendUpdate(double updateData, String serverip) {
        try {
            HttpClient httpClient = HttpClients.createDefault();
            HttpPost httpPost = new HttpPost("http://" + serverip + "/score");

            JSONObject json = new JSONObject();
            json.put("data", updateData);

            StringEntity se = new StringEntity(json.toString());
            se.setContentType(new BasicHeader(HTTP.CONTENT_TYPE, "application/json"));

            httpPost.setEntity(se);
            HttpResponse response = httpClient.execute(httpPost);

            if (response.getStatusLine().getStatusCode() != 200) {
                throw new RuntimeException("Failed : HTTP error code : "
                        + response.getStatusLine().getStatusCode());
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
