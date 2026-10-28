<?php

// Import the Postmark Client Class:
require_once('./vendor/autoload.php');
use Postmark\PostmarkClient;

$client = new PostmarkClient("ef9fb0c0-a0e4-49e6-ad7b-468f120622b5");
$fromEmail = "matthewp@yggdrasilwebdev.com";
$toEmail = "matthewp@yggdrasilwebdev.com";
$subject = "Hello from Postmark";
$htmlBody = "<strong>Hello</strong> dear Postmark user.";
$textBody = "Hello dear Postmark user.";
$tag = "example-email-tag";
$trackOpens = true;
$trackLinks = "None";
$messageStream = "outbound";

// Send an email:
$sendResult = $client->sendEmail(
  $fromEmail,
  $toEmail,
  $subject,
  $htmlBody,
  $textBody,
  $tag,
  $trackOpens,
  NULL, // Reply To
  NULL, // CC
  NULL, // BCC
  NULL, // Header array
  NULL, // Attachment array
  $trackLinks,
  NULL, // Metadata array
  $messageStream
);

?>
